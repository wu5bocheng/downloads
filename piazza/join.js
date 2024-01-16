//////////////////////////
// Modified Version
//////////////////////////
var numExistingClasses = 0;
var numNewClasses = 0;
var numAutocomplete = 0;
var currentTerm = "";
var fromJoinFlow = false;
var enrollmentBoxDisabled = false;
var already_added_stats = false;

//////////////////////////
// USER SPECIFIC DATA
//////////////////////////
var isLoggedIn = false;
var isInitiallyLoggedIn = false;
var isLoginEnrolling = false;
var completedEnrollment = false;

function loginUser(theEmail, thePass) {
    isLoginEnrolling = true;
    PA.call("user.login", {email: theEmail, pass: thePass}, null, function() {
      PA.call_pj("user.status", {}, null, function(data, aid) {
        PA.setUserStatus(data);
        $('.login .error').hide();
      }, null, this);
    }, function (err) {
    	$('.login .error').show().text(err);
      isLoginEnrolling = false;
    });
}

// HANDLE WHEN THE USER IS LOGGED IN
Piazzza.Ajax.events.observe("user_login", function() {
  isLoggedIn = true;
  $(".logged_in").show();
  $("#username").html(PA.user.name);
  if (completedEnrollment) {
    goToDashboard();
  } else {
    populateUserClasses(selectedTerm);
    if (!isInitiallyLoggedIn) {
      isInitiallyLoggedIn = true;
      populateClassSectionBoxes();
      if (!autoSelectDone) {
        doAutoSelect();
      }
    }
    renumberClassSectionBoxes();
    if (isLoginEnrolling) { //using log in to enroll
      if (PA && PA.user) {
        var email = findUsersSchoolEmail(schoolEmails, schoolHasEmail)
        if (email != null) {
          // if user has valid school email address move them forward
          joinClasses(email);
        } else {
          // show them field to enter a valid school email address
          clearEnrollmentStates();
          $("#enrollment").addClass("school_email_state");
        }
      }
      isLoginEnrolling = false;
    }
  }
});

// HANDLE WHEN THE USER IS LOGGED OUT
Piazzza.Ajax.events.observe("user_logout", function() {
  //window.location.reload();
  isLoggedIn = false;
  $(".logged_in").hide();
  $("#username").html("USERNAME");
  clearUserClasses();
  renumberClassSectionBoxes();
});

$(document).ready(function() {
  $(".logged_in .logout").click(function() {
    PA.logout();
  });

  $("#resend-registration-email").click(function() {
    PA.call("user.resend_welcome_email", {email: chosenEmail}, null, function(data) {
      $(this).closest('.support').text('Your email is on its way! It may take a few minutes to arrive.');
    }, function (err) {
      alert(err);
    });
    return false;
  });
});

//////////////////////////
// SEARCH A CLASS
//////////////////////////

// General
var schoolName = "Piazza"
var schoolHasEmail = true;
var schoolEmails = []
var selectedTerm = "Summer 2012";

// Search
var autoSelectDone = false;
var allClasses = [];
var classHave = {};
var classResult = [];
var classLastEmpty = 0;
var lastSearch = "";
var total = 0;

// Track Class Selections
var prefilledClassBoxes = 0;
var classSectionBoxes = 0;
var selectedClasses = {};
var chosenEmail = "";

function getNumClassesSelected() {
  var num = 0;
  for (var key in selectedClasses) {
    if (selectedClasses[key] && selectedClasses[key] != null) {
      num += 1;
    }
  }
  return num;
}

function populateNetworks(term) {
  //var params = {email: emailPattern, term: term};
  //PA.call_pj("network.get_all_networks", params, 1, function(data) {
  //  allClasses = data;
  //});
}

function profExists(theClass) {
  if (theClass.prof && theClass.prof.length > 0 && theClass.prof !== "None") {
    return true;
  }
  if (theClass.terms && theClass.terms[selectedTerm]) {
    if (theClass.terms[selectedTerm].prof && theClass.terms[selectedTerm].prof.length > 0 && theClass.terms[selectedTerm].prof !== "None") {
      return true;
    }
  }
  return false;
}

function filterClassSearch(obj) {
  var theStr = obj.val();
  var theClass = obj.closest('.class');
  if (!theStr || theStr.length < 2) {
    theClass.find('.autosuggest-box').hide();
  } else {
    /*if (theStr.length > 0 && lastSearch.length > 0 && theStr.indexOf(lastSearch) == 0 && allClasses.length < 50) {
    }
    else {
      var params = {email: emailPattern, term: selectedTerm, str: theStr};
      PA.call_pj("network.filter_classes", params, 1, function(data) {
        allClasses = data.list;
        total = data.total;
        lastSearch = theStr;
      });
    }*/
    var tstr = theStr.replace(/([^0-9 ]+)([0-9])/, '$1 $2');
    var termsplit = tstr.split(/\s/);
    var terms = [];
    for (var i = 0; i < termsplit.length; i++)
      terms.push(new RegExp(RegExp.quote(termsplit[i]), 'i'));

    classResult = [];
    for (var x = 0; x < allClasses.length; x++) {
      var net = allClasses[x];
      if (classHave[net.cn + "_" + selectedTerm])
        continue;
      var name = net.cn + ": " + net.n;
      var toks = name.split(/\s/);
      var matched = false;
      for (var i = 0; i < terms.length; i++) {
        matched = false;
        for (var j = 0; j < toks.length; j++) {
          if (toks[j].match(terms[i])) {
            matched = true;
            break;
          }
        }
        if (!matched)
          break;
      }
      if (!matched) continue;
      if (!net.terms || !net.terms[selectedTerm] || !profExists(net.terms[selectedTerm])) continue;
      var obj = {name:name, org:net, terms:net.terms};
      var nnn = obj.name;
      var tms = tstr.split(/\s/);
      var reg_str = "(" + tms.map(RegExp.quote).join('|') + ")";
      var reg2 = new RegExp(reg_str, 'ig');
      nnn = nnn.replace(reg2, '<strong>$&</strong>');
      obj.name = nnn;
      classResult.push(obj);
      if (classResult.length >= 50) break;
    }
    //classResult = allClasses.map(function(net) {
    //  if (classHave[net.name])// || (net.term != selectedTerm))
    //    return false;
    //});

    classResult = classResult.sort(function(a,b) {
      var t1 = {};
      var t2 = {};
      if (a.terms && a.terms[selectedTerm]) t1 = a.terms[selectedTerm];
      if (b.terms && b.terms[selectedTerm]) t2 = b.terms[selectedTerm];
      if (t1.cnt && t2.cnt && profExists(t1) && profExists(t2)) {
        return (t2.cnt - t1.cnt)
      } else if (t2.cnt && profExists(t2)) {
        return 1;
      } else if (t1.cnt && profExists(t1)) {
        return -1;
      }
      if (a.name > b.name) return 1;
      if (a.name < b.name) return -1;
      return 0;
    });

    var html = "";
    var num_results_show = Math.min(classResult.length, 50)
    for (var i = 0; i < num_results_show; i++) {
      var gray = "";
      var count = "";
      var cnt = 0;
      var term = {}
      if (classResult[i].terms && classResult[i].terms[selectedTerm]) term = classResult[i].terms[selectedTerm];
      if (term.cnt)
        cnt = term.cnt;
      //var prof = classResult[i].prof;
      if (cnt != null)
        if (cnt > 0 && profExists(term))
          count = cnt + " Enrolled";
      html += '<li data-pats="classes_item" onclick="return addClass(' + i + ',this)">';
      html += '<div class="autosuggest-count">' + count +'</div>';
      html += '<span class="autosuggest-class-name' + gray + '">' + classResult[i].name + '</span>';
      html += '</li>';
    }
    if (classResult.length > 50) {
      html += '<li class="small" style="text-align: center; color: #aaa;">... and ' + (classResult.length - 50) + ' more classes ...</li>';
    }

    if (classResult.length == 0 && (new Date()).getTime() - classLastEmpty > 10000) {
      classLastEmpty = (new Date()).getTime();
    }

  	if (classResult.length == 0) {
        $('.class.active .autosuggest-default').addClass('highlighted');
  	} else {
        $('.class.active .autosuggest-default').removeClass('highlighted');
  	}

    theClass.find('.autosuggest-results').html(html);
    theClass.find('.autosuggest-box').show();
    theClass.find('.autosuggest-input').text(theStr);

  }
}

function clearSearchStatus() {
  classResult = [];
  classLastEmpty = 0;
}

//////////////////////////////
// CREATE A CLASS
//////////////////////////////

function isValidCourseName(theString) {
  var pattern = /.*\S.*/;
  return pattern.test(theString);
}

function isValidCourseNumber(theString) {
	var pattern = /.*\S.*/;
	return pattern.test(theString);
}

function isValidEnrollment(theNumber) {
  if (theNumber > 0 && theNumber < 1000000) {
    return true;
  }
  return false;
}

function addClassToSelectedClasses(theClassData) {
  selectedClasses[theClassData.id] = theClassData;
  classHave[theClassData.course_number + "_" + selectedTerm] = true;
}

function convertWishlistClass(theCourseName, theCourseNumber, theTerm, theEnrollment, theSchool, theWishlistId, theUserId, theClassView) {
  var params = {
    name:           theCourseName,
    course_number:  theCourseNumber,
    term:           theTerm,
    enrollment:     theEnrollment,
    school:         theSchool,
    wishlist_id: {
      uid:            theUserId,
      wishlist_class: theWishlistId
    }
  };

  PA.call_pj("network.create", params, null, function(data){
      addClassToSelectedClasses(data);
      theClassView.attr('class_id', data.id);
      showCreateClassSuccess(theClassView, theCourseNumber, theCourseName);
      $(".add_more").show();
      showEnrollmentBox();
  }, function (err) {
    showCreateClassError(theClassView, err);
  });
}

function createClass(theCourseNumber, theCourseName, theTerm, theEnrollment, theSchool, theClassView) {
	var params = {
		name:           theCourseName,
    course_number:  theCourseNumber,
    term:           theTerm,
    enrollment:     theEnrollment,
    school:         theSchool
  };

  PA.call_pj("network.create", params, null, function(data){
      addClassToSelectedClasses(data);
      theClassView.attr('class_id', data.id);
      showCreateClassSuccess(theClassView, theCourseNumber, theCourseName);
  }, function (err) {
  	showCreateClassError(theClassView, err);
  });
}

function updateClass(theClassId, theCourseNumber, theCourseName, theEnrollment, theClassView) {
  var params = {
    id:             theClassId,
    name:           theCourseName,
    course_number:  theCourseNumber,
    enrollment:     theEnrollment
  }

  PA.call_pj("network.update_course_info", params, null, function(data) {
    selectedClasses[theClassId].name = theCourseName;
    selectedClasses[theClassId].course_number = theCourseNumber;
    selectedClasses[theClassId].enrollment = theEnrollment;
    showCreateClassSuccess(theClassView, theCourseNumber, theCourseName);
  }, function (err) {
    showCreateClassError(theClassView, err);
  });
}

function convertScrapedClass(theCourseNumber, theCourseName, theTerm, theEnrollment, theSchool, theClassView, inactive_check) {
  var params = {
    name:           theCourseName,
    course_number:  theCourseNumber,
    term:           theTerm,
    enrollment:     theEnrollment,
    school:         theSchool,
    inactive_check: inactive_check
  };

  PA.call_pj("network.create", params, null, function(data) {
      for (var i = 0; i < allClasses.length; i++) {
        if (allClasses[i].cn == theCourseNumber && allClasses[i].n == theCourseName) {
          allClasses[i].status = "active";
          allClasses[i].cnt = 0;
          allClasses[i].prof = [];
          if (!allClasses[i].terms) allClasses[i].terms = {};
          allClasses[i].terms[theTerm] = {cnt:0, prof:[]};
        }
      }
      addClassToSelectedClasses(data);
      theClassView.attr('class_id', data.id);
      theClassView.addClass('joining').removeClass('creating');
        //focus the next autocomplete box, if there is one
        if (theClassView.next('.class').length > 0) {
          theClassView.next('.class').find('.autosuggest input').focus();
        } else {
          theClassView.removeClass('active');
        }
      //return true;
  }, function (err) {
      theClassView.find('.warning').show().text("An instructor has inactivated this class for this term. Contact the instructor to enroll.");
      theClassView.addClass('inactive_error');
      theClassView.addClass('joining').removeClass('creating');

      // disable enroll button if all added classes are inactive errors
      var picks = 0;
      var inactive_err = 0;

      $("#new-classes").find('.class').each(function(index) {
        if ($(this).attr("class_id")) picks++;
        if ($(this).hasClass('inactive_error')) inactive_err++;
      });
      if (picks === inactive_err) {
        hideEnrollmentBox();
      }

      //focus the next autocomplete box, if there is one
        if (theClassView.next('.class').length > 0) {
          theClassView.next('.class').find('.autosuggest input').focus();
        } else {
          theClassView.removeClass('active');
        }
  });
}

function createWishListClasses(theEmail, theClasses, onlyWishlist) {
  PA.call_pj("network.create_wishlist_classes", {email: theEmail, classes : theClasses, only_wishlist : onlyWishlist}, null, function(data) {
    validateUser(data, theEmail);
  }, function (err) {
    alert(err);
  });
}

function showCreateClassSuccess(theClassView, theCourseNumber, theCourseName) {
  theClassView.removeClass('creating').addClass('joining');
  // populate the text fields with the updated info
  theClassView.find('.title').html(theCourseNumber + ': ' + theCourseName + ' <span>(new class created!)</span>');

  // focus the next autocomplete box, if there is one
  if ((theClassView.next('.class').length > 0) && !(theClassView.next('.class').hasClass('role_chosen'))) {
    theClassView.next('.class').find('.autosuggest input').focus();
  } else {
    theClassView.removeClass('active');
  }
}

function showCreateClassError(theClassView, theError) {
  //show the error from the backend
  theClassView.find('.create_class > .error').show().text(theError);
}

$(document).ready(function(){

  $("#new-classes").on("click",".create_class .btn-primary",function() {
    var form = $(this).closest(".create_class");
    var theClass = $(this).closest('.class');
    $(form).find('.error').hide();
    $(form).find(".course_name_field").siblings('.helper_text').show();
    var err = 0;

    var courseName = $(form).find(".course_name_field").val();
    if (!isValidCourseName(courseName)) {
    	$(form).find(".course_name_field").siblings('.error').show();
    	$(form).find(".course_name_field").siblings('.helper_text').hide();
    	err++;
    }
    var courseNumber = $(form).find(".course_number_field").val();
    if (!isValidCourseNumber(courseNumber)) {
    	$(form).find(".course_number_field").siblings('.error').show();
    	$(form).find(".course_number_field").siblings('.helper_text').hide();
    	err++;
    }
    var enrollment = $(form).find(".enrollment_field").val();
    if (!isValidEnrollment(enrollment)) {
    	$(form).find(".enrollment_field").siblings('.error').show();
    	$(form).find(".enrollment_field").siblings('.helper_text').hide();
    	err++;
    } else {
    	//strip out whitespace - otherwise, there's a backend error
    	enrollment = enrollment.replace(/ /g,'');
    }
    var term = $("#term").html();

    // if the form validates
    if (err === 0) {
      // differentiate between converting a scraped class, updating a class, and creating a brand new class
      var theClassId = theClass.attr("class_id");
      if (theClassId && selectedClasses[theClassId] && !(selectedClasses[theClassId].status == 'wishlist')) {
        if (selectedClasses[theClassId].status == 'scraped') {
          convertScrapedClass(theClassId, courseNumber, courseName, term, enrollment, schoolName, theClass, false);
        } else {
          theClass.attr("prof_created", true);
          updateClass(theClassId, courseNumber, courseName, enrollment, theClass);
        }
      } else { // brand new class
        if (theClass.attr("wishlist_id") && theClass.attr("user_id")) {
          var wishlistId = theClass.attr("wishlist_id");
          var userId = theClass.attr("user_id");
          convertWishlistClass(courseName, courseNumber, term, enrollment, schoolName, wishlistId, userId, theClass);
        } else {
          theClass.attr("prof_created", true);
          createClass(courseNumber, courseName, term, enrollment, schoolName, theClass);
        }
      }
    }
  });

  $("#new-classes").on("click",".create_class .cancel",function() {
  	$(this).closest('.class').removeClass('creating').addClass('joining');
  	$(this).closest('.class').find('.role input').attr('checked',false);
  	$(this).closest('.class').removeClass('role_chosen');
  });

	$('#class_list').on("focus",".autosuggest input",function(){
		$(document).find('.active').removeClass('active');
		$(this).closest('.class').addClass('active');
	});

  $(document).on("keyup", ".autosuggest input", function(e) {
    var keyCode = e.which;
    if(keyCode === 13 || keyCode === 40 || keyCode === 38) {
      var $selected = $(this).closest('.autosuggest').find('li.keypress-selected');
      if(keyCode === 13) { // enter
        // ignore if there is no content yet
        if($(this).val().length < 1) {
          return;
        }

        if($selected.length === 1) {
          $selected.click();
        } else {
          // if there currently is only one li, click it
          var $lis = $(this).closest('.autosuggest').find('li');
          if($lis.length === 1) {
            $lis.click();
          }
        }
      } else if(keyCode === 38) { // up arrow
        var $prev = $selected.prev('li');
         if($prev.length === 1) {
          $selected.removeClass('keypress-selected');
          $prev.addClass('keypress-selected');
        } else if(!$selected.parent().is('.autosuggest-default')) {
          $selected.removeClass('keypress-selected');
          $(this).closest('.autosuggest').find('ul.autosuggest-default li').addClass('keypress-selected');
         }
      } else if(keyCode === 40) { // down arrow
        if($selected.length === 0) {
          $(this).closest('.autosuggest').find('ul.autosuggest-default li').addClass('keypress-selected');
        } else {
          var $next = $selected.next('li');
          if($next.length === 1) {
            $selected.removeClass('keypress-selected');
            $next.addClass('keypress-selected');
          } else if($selected.parent().is('.autosuggest-default')) {
            $selected.removeClass('keypress-selected');
            $(this).closest('.autosuggest').find('ul.autosuggest-results li').first().addClass('keypress-selected');
          }
        }
      }
      var $box = $(this).closest('.autosuggest').find('.autosuggest-box-content');
      var $sel = $box.find('.keypress-selected');
      $sel.focus();
      // this doesn't work - it scrolls strangely up and down in the lower reaches of the autosuggest list. TODO: fix it
      //$box.scrollTop($sel.position().top /* - 3 * $sel.height() */);
      e.preventDefault();
      return false;
    } else {
      filterClassSearch($(this));
      return true;
    }
  });

	// edit class takes you back to search mode
	$("#class_list").on("click",".edit_class",function(){
		var theClass = $(this).closest('.class');
		theClass.find('.role .warning').hide();
    theClass.find('.role .no_instructor_warning').hide();
    theClass.removeClass('inactive_error');
    var theClassId = theClass.attr("class_id");
    if (theClassId && selectedClasses[theClassId]) {
      classHave[selectedClasses[theClassId].course_number + "_" + selectedTerm] = false;
      selectedClasses[theClassId] = null;
      theClass.removeAttr("class_id");
      theClass.removeAttr("wishlist_id");
      theClass.removeAttr("user_id");
    }
	  theClass.removeClass('joining wishlist role_chosen');
	  theClass.find('.role input').attr('checked',false);
	  theClass.find('.autosuggest-box').hide();

    // in case you hide it for classes that don't allow instructor enrollment
    theClass.find(".role_prof").show();
    theClass.find(".role_ta").show();
    theClass.find(".no_instructor_warning").hide();

    if (getNumClassesSelected() > 0) {
      showEnrollmentBox();
    } else {
      hideEnrollmentBox();
    }

    theClass.find('.autosuggest input[type="text"]').focus(); // needs to be last statement
	});

  $('#class_list').on('keyup', '.create_class input', function(e) {
    // tab goes to next input element
    if(e.which === 9) {
      var $div = $(this).closest('.input_group');
      var $input = $div.next().find('input').first();
      if($input.length === 1) {
        $input.focus();
      }
    }
  });
});

//////////////////////////////
// JOIN A CLASS
//////////////////////////////

function selectClass(theClass, theClassData) {
  if (!theClassData.terms || !theClassData.terms[selectedTerm]) {
    theClass.attr('class_id', "scraped");
  }
  else {
    theClass.attr('class_id', theClassData.terms[selectedTerm].id);
    // Keep track of selected class
    selectedClasses[theClassData.terms[selectedTerm].id] = theClassData;
    if (!theClassData.course_number) theClassData.course_number = theClassData.cn;
    if (!theClassData.name) theClassData.name = theClassData.terms[selectedTerm].name;
  }
  if (theClassData.status == "scraped") {
    theClass.find('.details').html('');
  } else {
    //if it's not a scraped class, we already know the instructors and # enrolled
    if (profExists(theClassData) && theClassData.terms && theClassData.terms[selectedTerm].cnt > 0) {
      theClass.find('.details').html('Instructors: ' + theClassData.terms[selectedTerm].prof + ' &middot; ' + theClassData.terms[selectedTerm].cnt + ' Enrolled');
    } else {
      theClass.find('.details').html('');
    }
  }

  // load class number and name in case the user is asked to edit this information
  theClass.find('.course_name_field').val(theClassData.name);
  theClass.find('.course_number_field').val(theClassData.cn);
  theClass.find('.enrollment_field').val('');

  // hide the search and let the user select their role
  theClass.addClass('joining');
  theClass.find('.error .class_num').text(theClassData.cn);

  if (doesClassNeedCode(theClassData)) {
    theClass.find(".access_code").show();
  }

  if (!doesClassSupportInstructorJoin(theClassData)) {
    theClass.find(".instructor_join").hide();
    theClass.find(".no_instructor_warning").show();
  } else {
    theClass.find(".instructor_join").show();
    theClass.find(".no_instructor_warning").hide();
  }

  // fill the static fields with the selected class' info
  theClass.find('.title').html(theClassData.cn + ': ' + theClassData.name + ' <span>(<a class="edit_class">edit</a>)</span>');

  showEnrollmentBox();
}

function autoSelectClass(shortNumber, theTerm) {
  for (var i = 0; i < allClasses.length; i++) {
    if (!allClasses[i].terms || !allClasses[i].terms[theTerm]) continue;
    const termData = allClasses[i].terms[theTerm];

    if ((allClasses[i].cn && allClasses[i].cn.replace(/[^\w]/g, '').toLowerCase() == shortNumber) ||
        (termData.short_number && termData.short_number.replace(/[^\w]/g, '').toLowerCase() == shortNumber)) {
      if (!classHave[allClasses[i].cn + "_" + theTerm]) {
        var theClass = $("#new-classes .class").first();
        selectClass(theClass, allClasses[i]);
      }
    }
  }
}

function autoSelectWishlistClass(theCourseNumber, theUserId, theWishlistId) {
  var theClass = $("#new-classes .class").first();
  theClass.attr("user_id", theUserId);
  theClass.attr("wishlist_id", theWishlistId);
  theClass.find('.course_name_field').val(theCourseNumber);
  theClass.find(".role_prof").attr("checked", "checked");
  theClass.addClass('role_chosen');
  theClass.addClass('creating').removeClass('joining');
  $(".add_more").hide();
}

function addNewClass(obj) {
	var className = $(obj).find('.autosuggest-input').text();
  var theClass = $(obj).closest('.class');

// see if we have such class already
  for (var x = 0; x < classResult.length; x++) {
    var net = classResult[x].org;
    if (className.toLowerCase() == net.cn.toLowerCase()) {
      addClass(x, obj);
      return false;
    }
  }

  theClass.removeAttr("class_id");

	// hide the search and let the user select their role
	$(obj).closest('.class').addClass('joining');
  $(obj).closest('.class').find('.error .class_num').text(className);

	// fill the static fields with the selected class' info
  $(obj).closest('.class').find('.title').html(className+' <span>(<a class="edit_class">edit</a>)</span>');

  $(obj).closest('.class').find('.role .error').hide();

  showEnrollmentBox();
  clearSearchStatus();

  return false;
}

function addClass(idx, obj) {
  var item = classResult[idx].org;
  var theClass = $(obj).closest('.class');
  theClass.find('.error').hide();
  theClass.find('.warning').hide();
  clearSearchStatus();
  $('.lti_error').hide();
  // if (item.terms[selectedTerm] && item.terms[selectedTerm].lti_only) {
  //   $('.lti_error').show();
  //   $('.lti_error_class_name').text(item.cn + ": " + item.n);
  //   $('.lti_error_class_nr').text(item.cn);
  //   $('.lti_error_instructors').text("Instructors: " + item.terms[selectedTerm].prof);
  //   theClass.find('input[type=text]').val('');
  //   theClass.find('.autosuggest-box').hide();
  //   return false;
  // }
  classHave[item.cn + "_" + selectedTerm] = true;
  selectClass(theClass, item);

  return false;
}

function doesClassNeedCode(theClass) {
  if (theClass && theClass.terms && theClass.terms[selectedTerm] &&
    theClass.terms[selectedTerm].auto_join && theClass.terms[selectedTerm].auto_join.match("code") && theClass.terms[selectedTerm].cnt > 0) {
    return true;
  }
  return false;
}

function doesClassSupportInstructorJoin(theClass) {
  if (theClass && theClass.terms && theClass.terms[selectedTerm] &&
    theClass.terms[selectedTerm].auto_join && theClass.terms[selectedTerm].auto_join.match("no-profs")) {
    return false;
  }
   return true;
}

function doesClassSupportFreeEmail(theClass) {
  if (theClass && theClass.terms && theClass.terms[selectedTerm] &&
    theClass.terms[selectedTerm].auto_join &&
    (theClass.terms[selectedTerm].auto_join.match("free-email") || theClass.terms[selectedTerm].auto_join.match("code"))) {
    return true;
  }
   return false;
}

function validateUser(isRegistered, email) {
  if (isRegistered == "FUTURE_REG") {
    $('#lower-content').hide();
    $('#thanks').show();
  } else if (isRegistered == "IS_REG") {
    if (isLoggedIn) {
      goToDashboard();
    } else {
      clearEnrollmentStates();
      $("#enrollment").addClass("login_state");
      //$("#enrollment .account_already").hide();
      $("#enrollment .enrollment_done").show();
      $("#enrollment .account_already_warning").show();
      $('#existing-email').text(email);
      $('.email_field').val(email);
      $('.email_confirm_field').val(email);
    }
  } else {
    clearEnrollmentStates();
    $("#enrollment").addClass("validate_state");
  }
}

function joinClasses(theEmail) {
  var totalRealClasses = 0;
  var studentClasses = [];
  var taClasses = [];
  var professorClasses = [];
  var classAccessCodes = {};
  var err = 0;
  var wishlistClasses = []
  var retValue = false;

  $('#enrollment .form_error').html('').hide();

  // iterate through classes they have selected
  $("#new-classes").find('.class').each(function(index) {
  	$(this).find('.error').hide();

    var classId = $(this).attr("class_id");
    if (selectedClasses[classId]) {
      if (selectedClasses[classId].status === "wishlist") {
        wishlistClasses.push(selectedClasses[classId]);
      } else {
        if ($(this).find('.role_prof').attr('checked')) {
          professorClasses.push(classId);
          totalRealClasses += 1;
        } else if ($(this).find('.role_ta').attr('checked')) {
          taClasses.push(classId);
          totalRealClasses += 1;
        } else if ($(this).find('.role_stud').attr('checked')) {
          studentClasses.push(classId);
          totalRealClasses += 1;
        } else {
          $(this).find('.role .error').show();
          err++;
        }

        var accessCode = $(this).find(".access_code input").val();
        if (accessCode && accessCode.length > 0) {
          classAccessCodes[classId] = accessCode;
        } else if (doesClassNeedCode(selectedClasses[classId])) {
          $(this).find('.access_code .error').show();
          err++;
        }
      }
    }
  });

  if (err > 0) return retValue;

  // log how many classes person is adding
  allAddedClasses = totalRealClasses + wishlistClasses.length;
  PA.call_pj("generic.event_to_requests", {event: "student.add_classes_added", num_classes: allAddedClasses, email: theEmail},1);

  chosenEmail = theEmail;
  if (totalRealClasses == 0) {
    $(".edit_classes").hide(); // DISABLE EDIT NOW
    createWishListClasses(theEmail, wishlistClasses, true);
  } else {
    retValue = true;
//    _gaq.push(['_setCustomVar', 1, "numClasses", totalRealClasses, 2]);
  	var params = {email : theEmail, nids : studentClasses, nids_ta : taClasses, nids_prof : professorClasses, codes : classAccessCodes};
    if (isLoggedIn && PA.user && PA.user.id) {
      params["uid"] = PA.user.id;
    }
  	PA.call_pj("network.join", params, null, function(data) {
      completedEnrollment = true;
      $(".edit_classes").hide(); // DISABLE EDIT NOW
      if (wishlistClasses.length > 0) {
        createWishListClasses(theEmail, wishlistClasses, false);
        readOnlyView(false);
        enterReviewView();
      } else {
        validateUser(data, theEmail);
      }
  	}, function(err) {
      //alert(err);
      readOnlyView(false);
  	  enterReviewView();
      $('#enrollment .form_error').html(err).show();
      if (err == "An account already exists with this email") {
        $("#enrollment .login_other_account").show();
        var theEmail = $('.school_email .email_field').val();
        $('.login .email_field').val(theEmail);
        $('.login .password_field').focus();
      }
    });
  }
  if (fromJoinFlow && !already_added_stats) {
    numNewClasses = $("#new-classes").find(".joining").length;
    numExistingClasses = $("#existing-classes").find(".joining").length;
    numAutocomplete = numNewClasses;
    for (var key in selectedClasses) {
      if (selectedClasses[key] != null)
        if (("" == selectedClasses[key]["prof"]) ||  "wishlist" == selectedClasses[key]["status"]) numAutocomplete -= 1;
    }
    PA.addStatIfNew('add_classes.join_existing', numExistingClasses, 'add_classes.join_added', numNewClasses,
      'add_classes.join_auto_complete', numAutocomplete, currentTerm, theEmail);
    already_added_stats = true;
  }

  return retValue;
}

function allFreeEmailSelected() {
  var n = 0;
  var freeEmail = 0;
  var total = 0;
  for (var key in selectedClasses) {
    if (selectedClasses.hasOwnProperty(key) && selectedClasses[key] != null) {
      if (doesClassSupportFreeEmail(selectedClasses[key])) {
        freeEmail = freeEmail + 1;
      }
      total = total + 1;
    }
  }

  if (total > 0 && freeEmail == total) {
    return true;
  }

  return false;
}

function findUsersSchoolEmail(schoolEmails, schoolHasEmail) {
  if (!schoolHasEmail) {
    return PA.user.email;
  }

  if (allFreeEmailSelected()) {
    return PA.user.email;
  }

  var e = 0;
  for (e = 0; e < PA.user.emails.length; e++) {
    var email = PA.user.emails[e];
    var parts = email.split('@');
    if (parts.length == 2) {
      var domain = parts[1];
      var i = 0;
      for (i = 0; i < schoolEmails.length; i++) {
        if (domain.indexOf(schoolEmails[i]) != -1) {
          return email;
        }
      }
    }
  }

  return null;
}

//when a user selects their role in the class
$(document).on('change','.role input',function(){
	var theClass = $(this).closest('.class');
  var theClassId = theClass.attr("class_id");

	//regardless of what they choose, hide the red arrow and show the green check
	theClass.addClass('role_chosen');
	theClass.find('.error').hide();

  // clear any old state
  theClass.find('.warning').hide();

  if (theClassId && theClassId == 'scraped') { // scraped class
    if ($(this).hasClass('role_stud')) { // student

      // NEED TO CREATE THE CLASS AND SET LOCAL DATA
      var courseName = theClass.find('.course_name_field').val();
      var courseNumber = theClass.find('.course_number_field').val();
      var enrollment = 25;
      var term = selectedTerm;
      var school = schoolName;

      convertScrapedClass(courseNumber, courseName, term, enrollment, school, theClass, true);

    }
    else { // prof or ta, have them check data and fill in enrollment
      theClass.addClass('creating').removeClass('joining');
      theClass.find('.enrollment_field').focus();
    }
  }
  else if (theClassId && selectedClasses[theClassId] && selectedClasses[theClassId].terms && selectedClasses[theClassId].terms[selectedTerm]) { // active class
    if ($(this).hasClass('role_stud')) { // student
      theClass.addClass('joining').removeClass('creating');
      //focus the next autocomplete box, if there is one
      if ((theClass.next('.class').length > 0) && !(theClass.next().hasClass('role_chosen'))) {
        theClass.next('.class').find('.autosuggest input').focus();
      } else {
        theClass.removeClass('active');
      }
    }
    else { // prof or ta
      // join an existing class as an instructor
      if (profExists(selectedClasses[theClassId])) {
        // simple join since an instructor already joined this class
        theClass.find('.warning').show();
        theClass.addClass('joining').removeClass('creating');
        //focus the next autocomplete box, if there is one
        if (theClass.next('.class').length > 0) {
          theClass.next('.class').find('.autosuggest input').focus();
        } else {
          theClass.removeClass('active');
        }
      }
      else {
      	//if wishlist class, put course_number in course_name_field
      	if (theClass.hasClass('wishlist')) {
          theClass.addClass('creating').removeClass('joining');
      		var existingString = theClass.find('.course_name_field').val();
      		if (existingString === "") theClass.find('.course_name_field').val(selectedClasses[theClassId].course_number);
      		theClass.find('.course_name_field').focus();
      	} else {
          if (theClass.attr("prof_created")) { // user already created this time entering info
            theClass.addClass('joining').removeClass('creating');
            //focus the next autocomplete box, if there is one
            if (theClass.next('.class').length > 0) {
              theClass.next('.class').find('.autosuggest input').focus();
            } else {
              theClass.removeClass('active');
            }
          } else {
            // ask instructor to update the class information
            theClass.addClass('creating').removeClass('joining');
            theClass.find('.course_number_field').val(selectedClasses[theClassId].course_number);
            theClass.find('.course_name_field').val(selectedClasses[theClassId].name);
            theClass.find('.enrollment_field').val(25);
            theClass.find('.enrollment_field').focus();
          }
	      }
      }
    }
  }
  else { // new class
    if ($(this).hasClass('role_stud')) { // student
      // create a wish list class
      var courseNumber = theClass.find(".autosuggest-input").text();
      var params = {term : selectedTerm, course_number : courseNumber, school: schoolName, status : "wishlist"};
      selectedClasses[courseNumber] = params;
      theClass.attr("class_id", courseNumber);
      theClass.addClass('wishlist');
      theClass.addClass('joining').removeClass('creating');

      //focus the next autocomplete box, if there is one
      if (theClass.next('.class').length > 0) {
        theClass.next('.class').find('.autosuggest input').focus();
      } else {
        theClass.removeClass('active');
      }
    }
    else { // prof or ta
      // create a brand new class

      if (theClass.attr("prof_created")) { // user already created this time entering info
        theClass.addClass('joining').removeClass('creating');
        //focus the next autocomplete box, if there is one
        if (theClass.next('.class').length > 0) {
          theClass.next('.class').find('.autosuggest input').focus();
        } else {
          theClass.removeClass('active');
        }
      } else {
        var theSearchString = theClass.find('.autosuggest input[type="text"]').val();
        var existingString = theClass.find('.course_name_field').val();

        theClass.removeClass('wishlist');
        theClass.addClass('creating').removeClass('joining');
        if (existingString === "") {
        	theClass.find('.course_name_field').val(theSearchString);
        }
        theClass.find('.course_name_field').focus();
      }
    }
  }

});

//key bindings
$(document).on('keydown','input', function(e) {
  var keyCode = e.keyCode || e.which;

  //pressing tab brings you to the next expected input field
  if (keyCode == 9) {
    //if you're inside the create class form, do nothing
    //if ($(this).closest('.class').hasClass('creating')) return false;

    //if you've got the autosuggest thingee open, tab to the next search box
    var $box = $(this).siblings('.autosuggest-box');
    var selectNext = function() {
      $('#new-classes').find('.class_section_box').not('.joining').find('.autosuggest input').first().focus();
    };
    if ($box.is(':visible')) {
    	e.preventDefault();
    	$box.hide();
    	addNewClass($box);
      selectNext();
    } else if ($(this).closest('.class_section_box').find('.role').is(':visible')) {
      e.preventDefault();
      selectNext();
    }
  }
});

function readOnlyView(readOnly) {
  $('#class_list').find('input').prop("disabled", readOnly);
  $('#class_list').find('button').prop("disabled", readOnly);
  $('#class_list').find('option').prop("disabled", readOnly);
  $('#class_list').find(".remove_class").prop("disabled", readOnly);
  if( readOnly )
    $(".add_more").hide();
  else
    $(".add_more").show();

}

function enterReviewView() {
  $('.box-section').addClass('review');
  $('.change_link').hide();
  $('#inst_message').hide();
  $('#enroll_btn').hide();
  $('#new-classes').find('.class').each(function(index) {
    var theClassId = $(this).attr("class_id");
    if (!theClassId || $(this).hasClass("inactive_error")) {
      $(this).hide();
    } else {
      //we want to hide the radio buttons and show them their role selection
      var theRole = $(this).find('.role input:checked').attr('class');

      if (theRole === 'role_stud') theRole = 'Student';
      else if (theRole === 'role_ta') theRole = 'TA';
      else theRole = 'Professor';

      $(this).find('.text').text('Joining as ' + theRole);
      $(this).find('.role input, .role label, .role .warning, .role .no_instructor_warning').hide();
      $(this).find('.access_code').hide();
      $(this).removeClass('active');
    }
  });
}
function addClassReview(){
  $('.school-name-wrapper').hide();
  $('#inst_message').hide();
  $('#side_message').hide();
  $('#class_list').hide();
  $('#enroll_btn').hide();
  $('.add-class-review').show();
  $('#class_list_preview').show();
}

function exitReviewView() {
  $('.box-section').removeClass('review');
  $('.change_link').show();
  $('#inst_message').show();
  $('#enroll_btn').show();
  $('#new-classes').find('.class').each(function(index) {
    var theClassId = $(this).attr("class_id");
    if (!theClassId || $(this).hasClass("inactive_error")) {
      $(this).show();
    } else {
      var theRole = $(this).find('.role input:checked').attr('class');
	    if (theRole != 'role_stud') $(this).find('.role .warning').show();

	    //re-show the radio buttons
	    $(this).find('.text').text('Join as:');
	    $(this).find('.role input, .role label').show();
      if (doesClassNeedCode(selectedClasses[theClassId])) {
        $(this).find('.access_code').show();
      }

      if (!doesClassSupportInstructorJoin(selectedClasses[theClassId])) {
        $(this).find(".instructor_join").hide();
        $(this).find(".no_instructor_warning").show();
      } else {
        $(this).find(".instructor_join").show();
        $(this).find(".no_instructor_warning").hide();
      }
    }
  });
  $('#enrollment').attr('class','clearFix');

}

$(document).ready(function() {
  $('.edit_classes').click(function() {
    exitReviewView();
  });

  function doEnroll() {
  	//if the user has not selected a role for all classes
  	var err = 0;
    var picks = 0;
    var inactive_err = 0;

    $("#new-classes").find('.class').each(function(index) {
      //numNewClasses += 1;
    	var theClass = $(this);
      $(this).find('.error').hide();
      $(this).find('.input_group .helper_text').show();
      if ($(this).attr("class_id")) picks++;
	    if ($(this).hasClass("joining")) {
	      if (!$(this).hasClass('role_chosen')) {
	        $(this).find('.role .error').show();
	        err++;
	      }
        if ($(this).hasClass('inactive_error')) inactive_err++;
	    } else if ($(this).hasClass("creating")) {
	      showCreateClassError(theClass,'Please finish creating your class');
	      err++;
	    }
      var classId = $(this).attr("class_id");
      if (selectedClasses[classId]) {
        var accessCode = $(this).find(".access_code input").val();
        if (accessCode && accessCode.length > 0) {
          // nothing, already check before this happened
        } else if (doesClassNeedCode(selectedClasses[classId])) {
          $(this).find('.access_code .error').show();
          err++;
        }
      }
    });

  	if (err > 0 || (picks === 0 && !fromDashboard) || (picks === inactive_err && !fromDashboard)) {
      return false;
    }
  	// check how many classes they selected
    var selectedClassesLen = 0;
    for (var key in selectedClasses) {
      if (selectedClasses[key] != null)
        selectedClassesLen += 1;
    }

    var enterReviewState = true;
    if (!fromDashboard) fromJoinFlow = true;

    if (PA && PA.user) {
      var email = findUsersSchoolEmail(schoolEmails, schoolHasEmail);
        numNewClasses = $("#new-classes").find(".joining").length;
        numExistingClasses = $("#existing-classes").find(".joining").length;
        numAutocomplete = numNewClasses;
        for (var key in selectedClasses) {
          if (selectedClasses[key] != null)
            if (("" == selectedClasses[key]["prof"]) ||  "wishlist" == selectedClasses[key]["status"]) numAutocomplete -= 1;
        }
        var currentTerm = selectedTerm.toLowerCase().replace(/\s+/g, "") || "other";
        if (fromDashboard && !already_added_stats) {
          var theEmail = "";
          if (email != null) theEmail = email;
          else theEmail = PA.user.email;
          PA.addStatIfNew('add_classes.dashboard_existing', numExistingClasses, 'add_classes.dashboard_added', numNewClasses,
            'add_classes.dashboard_auto_complete', numAutocomplete, currentTerm, theEmail);
          PA.logEvent('add_classes.click_save_close', currentTerm);
          //PA.markSeenUnseen('list-other-classes-' + currentTerm);
          already_added_stats = true;
        }
      if (email != null) {
        // if user has valid school email address move them forward
        // do analytics stats
        var uid = PA.user.id;

        // If failed to join classes, show review state
        enterReviewState = !joinClasses(email);
        if( !enterReviewState )
          readOnlyView(true);
      } else {
        // show them field to enter a valid school email address
        clearEnrollmentStates();
        $("#enrollment").addClass("school_email_state");
      }
    } else {
      // show them box to login or enter an email
      clearEnrollmentStates();
      $("#enrollment").addClass("login_create_state");
    }
    if (schoolEmails.length == 0 || allFreeEmailSelected() || !schoolHasEmail)
      $('.hide_if_no_email').hide();
    else
      $('.hide_if_no_email').show();

    if( enterReviewState )
      enterReviewView();

  }

  $('#enroll_btn').click(function() {
    // first verify if any access codes are wrong
    var numClassAccessCodes = 0;
    var classAccessCodes = {};
    $("#new-classes").find('.class').each(function(index) {
      $(this).find('.error').hide();

      var classId = $(this).attr("class_id");
      if (selectedClasses[classId]) {
        var accessCode = $(this).find(".access_code input").val();
        if (accessCode && accessCode.length > 0) {
          classAccessCodes[classId] = accessCode;
          numClassAccessCodes += 1;
        }
      }
    });

    if (numClassAccessCodes > 0) {
      PA.call("network.verify_class_access_codes", {codes : classAccessCodes}, null, function(data) {
        if (data.invalid_codes && data.invalid_codes.length > 0) {
          $("#new-classes").find('.class').each(function(index) {
            var classId = $(this).attr("class_id");
            if (data.invalid_codes.exist(classId)) {
              $(this).find('.access_code .error').show();
            }
          });
        } else {
          doEnroll();
        }
      }, function (err) {
        alert(err);
      });
    } else {
      return doEnroll();
    }
  });

  $('#new-classes').on('focus','.create_class input[type="text"]',function(){
  	$(this).closest('.create_class').find('.error').hide();
  	$(this).closest('.input_group').find('.helper_text').css('visibility','visible');
  	$('.class').removeClass('active');
  	$(this).closest('.class').addClass('active');
    $(this).closest('.class').find('.helper_text').show();
  });
  $('#new-classes').on('blur','.create_class input[type="text"]',function(){
  	$(this).closest('.input_group').find('.helper_text').css('visibility','hidden');
  });

  function doCreateAccount() {
    var email = $('.new_to_piazza .email_field').val().trim();
    var confirm = $('.new_to_piazza .email_confirm_field').val().trim();
    $('.new_to_piazza .error').hide();

    //check if the emails match each other
    if (email !== confirm) {
      $(".new_to_piazza .error.match").show();
      return false
    } else if (!isValidEmailAddress(email)) {
      $(".new_to_piazza .error.valid").show();
      return false
    }

    joinClasses(email);

    return true;
  }

  $(".new_to_piazza .btn-primary").click(function() {
    doCreateAccount();
  });

  $(".new_to_piazza .email_confirm_field").keypress(function(e) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
      return doCreateAccount();
    }
    return true;
  });

  $(".account_already .btn-primary").click(function() {
    clearEnrollmentStates();
    $("#enrollment").addClass("login_state");
  });

  function doLoginUser() {
    var email = $(".login .email_field").val();
    var password = $(".login .password_field").val();

    $('.login .error').hide();
    if (email.length < 1 || password.length < 1) {
      $('.login .error').show().text('Oops! Did you forget to enter something?');
      return false;
    }
    loginUser(email, password);

    return true;
  }

  $(".login .btn-primary").click(function() {
    doLoginUser();
  });

  $(".login .password_field").keypress(function(e) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
      return doLoginUser();
    }
    return true;
  });

  $(".login .btn-secondary").click(function() {
    clearEnrollmentStates();
    $("#enrollment").addClass("login_create_state");
    $('#enrollment .error').hide();
    //$(".account_already").show(); // in case it was hiden in the past
  });

  function doCreateSchoolAccount() {
    var email = $(".school_email .email_field").val().trim();
    var confirm = $(".school_email .email_confirm_field").val().trim();
    $('.school_email .error').hide();

    //check if the emails match each other
    if (email !== confirm) {
      $(".school_email .error.match").show();
      return false
    } else if (!isValidEmailAddress(email)) {
      $(".school_email .error.valid").show();
      return false
    }

    joinClasses(email);

    return true;
  }

  $(".school_email .btn-primary").click(function() {
    doCreateSchoolAccount();
  });

  $(".school_email .email_confirm_field").keypress(function(e) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
      return doCreateSchoolAccount();
    }
    return true;
  });

  function doValidateUserToken() {
    var email = chosenEmail;
    var token = $(".validate .code_field").val();
    var params = {email: email, token : token}
    PA.call("user.verify_primary_email", params, null, function(data) {
      if (data.error) {
        $('.validate p.error').show();
        //alert(data.error);
      } else {
        if (isLoggedIn && PA.user.emails.exist(email) == - 1) {
          goToLinkAccounts(token);
        } else {
          goToFirstLogin(token);
        }
      }
    }, function (err) {
      $('.validate p.error').show();
    });

    return true;
  }

  $(".validate .code .btn").click(function() {
    return doValidateUserToken();
  });

  $(".validate .code_field").keypress(function(e) {
    var keycode;
    if (window.event) keycode = window.event.keyCode;
    else if (e) keycode = e.which;
    else return true;

    if (keycode == 13) {
      return doValidateUserToken();
    }
    return true;
  });

  $('.validate input[type="text"]').focus(function(){
  	$('.validate p.error').hide();
  });

  $("#enrollment .login_other_account").click(function() {
    PA.call("user.logout", {}, null, function() {
      PA.clearUserStatus();
      clearEnrollmentStates();
      $("#enrollment").addClass("login_state");
      $('#enrollment .error').hide();
      $('#enrollment .form_error').html('').hide();
      $(".login_other_account").hide();
    }, null, this);
    return true;
  });

});


//////////////////////////////
// TERM SELECTION
//////////////////////////////

function changeTerm(oldTerm, newTerm) {
  selectedTerm = newTerm;
  $("#term").html(newTerm);
  $("#term_sec").html(newTerm);

  populateUserClasses(newTerm);
  populateNetworks(newTerm);

  clearClassSections();
  classSectionBoxes = 0;
  selectedClasses = {};

  populateClassSectionBoxes();

  hideTermChoices();
  exitReviewView();
}

function showTermChoices() {
	$('#term, .list_header a.change_link').hide();
	$('#term_change').show();
}

function hideTermChoices() {
  $('#term, .list_header a.change_link').show();
  $('#term_change').hide();
  enrollmentBoxDisabled = false;
  if (getNumClassesSelected() > 0) {
    showEnrollmentBox();
  }
}

//////////////////////////////
// GENERAL HELPERS
//////////////////////////////

function isValidEmailAddress(emailAddress) {
  var pattern = new RegExp(/^((([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+(\.([a-z]|\d|[!#\$%&'\*\+\-\/=\?\^_`{\|}~]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])+)*)|((\x22)((((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(([\x01-\x08\x0b\x0c\x0e-\x1f\x7f]|\x21|[\x23-\x5b]|[\x5d-\x7e]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(\\([\x01-\x09\x0b\x0c\x0d-\x7f]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF]))))*(((\x20|\x09)*(\x0d\x0a))?(\x20|\x09)+)?(\x22)))@((([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|\d|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.)+(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])*([a-z]|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])))\.?$/i);
  return pattern.test(emailAddress);
}

function goToDashboard() {
  var dashboardPath = "/class";
  window.location = dashboardPath;
}

function goToFirstLogin(token) {
  var firstLoginPath = "/first_login?token=" + token;
  window.location = firstLoginPath;
}

function goToLinkAccounts(token) {
  var linkAccountsPath = "/link_accounts/" + token;
  window.location = linkAccountsPath;
}

function randomNum(hi){
    return Math.floor(Math.random()*hi) + 48;
}

function randomChar(){
    return String.fromCharCode(randomNum(42));
}

function randomString(length){
   var str = "";
   for(var i = 0; i < length; ++i){
        str += randomChar();
   }
   return str;
}


//////////////////////////////
// VIEW HELPERS
//////////////////////////////

function clearUserClasses() {
  var list = $("#existing-classes");

  // CLEAR LIST
  $(list).find(".class").remove();
  prefilledClassBoxes = 0;
}

function populateUserClasses(theTerm) {
  var list = $("#existing-classes");

  // CLEAR LIST
  $(list).find(".class").remove();
  prefilledClassBoxes = 0;

  if (PA && PA.user) {
    // POPULATE CLASSES
    var numClass = 1;
    PA.user.networks.forEach(function(net) {
      if (net.term == theTerm && net.school == schoolName) {
        numExistingClasses += 1;
        var item = '';

        item += '<div class="class joining">\
                <label class="main">\
                <span>Class </span><span class="class_num">';
        item += numClass;
        item += '</span><span>:</span>\
                </label>\
                <div class="container">\
                <div class="selected">\
                <div class="title">';
        if (net.status == "wishlist") {
          item += net.course_number + '</div>';
        } else {
          item += net.course_number + ': ' + net.name + '</div>';
          item += '<div class="details">';
          if (net.profs && net.profs.length > 0) {
            var prof_names = [];
            for (var i = 0; i < net.profs.length; i++) {
              if (net.profs[i].name && net.profs[i].name.length > 0 && prof_names.length < 3 && !net.profs[i].us) {
                prof_names.push(net.profs[i].name);
              }
            }
            if (prof_names.length == 0) {
              item += 'Instructors: None';
            } else if (prof_names.length == 1) {
              item += 'Instructor: ' + prof_names[0];
            } else {
              item += 'Instructors: ';
              for (var i = 0; i < prof_names.length; i++) {
                item += prof_names[i];
                if (i != (prof_names.length - 1)) {
                  item += ', ';
                }
              }
            }
          } else {
            item += 'Instructors: None'
          }
          if (net.user_count > 0) {
            item += ' &middot ' + net.user_count + ' Enrolled';
          }
          item += '</div>';
        }
        item += '<div class="role" style="margin:0;">\
                <div class="role_title">\
                <div class="helpers">\
                <i class="icon-ok"></i>\
                </div>\
                <span class="text">Already joined as ';
        if (PA.user.can_admin && PA.user.can_admin[net.id]) {
          if (PA.user.can_admin[net.id] > 5) {
            item += 'Professor';
          } else {
            item += 'Teaching Assistant';
          }
        } else {
          item += 'Student';
        }
        item += '</span></div></div></div></div></div>';

        $(list).append(item);
        numClass++;
        classHave[net.course_number + "_" + theTerm] = true;
      }
    });
    prefilledClassBoxes = numClass - 1;
  }
}

function clearClassSections() {
  var list = $("#new-classes");
  $(list).find(".class").remove();
}

function addClassSection(required) {
  var rand = randomString(32);
  var totalClasses = prefilledClassBoxes + classSectionBoxes + 1;

  var theHTML = '';
  if (required)
    theHTML += '<div data-pats="classes_list_item" class="class class_section_box required">';
  else
    theHTML += '<div data-pats="classes_list_item" class="class class_section_box">';
  theHTML += '  <label class="main">';
  theHTML += '    <span>Class </span><span class="class_num">' + totalClasses + '</span><span>:</span>';
  theHTML += '  </label>';
  theHTML += '  <div class="container">';
  theHTML += '    <div class="search">';
  theHTML += '      <div class="autosuggest">';
  theHTML += '        <input data-pats="textbox" type="text" name="search-text"/>';
  theHTML += '        <div data-pats="classes_dropdown" class="autosuggest-box" style="display:none;">';
  theHTML += '          <div class="autosuggest-box-content">';
  theHTML += '            <ul class="autosuggest-default">';
  theHTML += '              <li>Searching for &quot;<span class="autosuggest-input"></span>&quot;</li>';
  theHTML += '            </ul>';
  theHTML += '            <ul data-pats="classes" class="autosuggest-results">';
  theHTML += '            </ul>';
  theHTML += '          </div>';
  theHTML += '        </div>';
  theHTML += '      </div>';
  theHTML += '      <div class="remove_class">&times;</div>';
  theHTML += '    </div>';
  theHTML += '    <div class="selected">';
  theHTML += '      <div class="access_code">';
  theHTML += '        <label>Class Access Code:</label>';
  theHTML += '        <input type="text" class="input-small"/>';
  theHTML += '        <p class="error">Incorrect access code - please try again.</p>';
  theHTML += '      </div>';
  theHTML += '      <div class="title"><span>(<a class="edit_class">edit</a>)</span></div>';
  theHTML += '      <div class="details"></div>';
  theHTML += '      <div class="role"> <!-- add class error or ok to trigger correct styles -->';
  theHTML += '        <div class="role_title">';
  theHTML += '          <div class="helpers">';
  theHTML += '            <span class="arrow"><i class="icon-arrow-right"></i></span>';
  theHTML += '            <span class="check"><i class="icon-ok"></i></span>';
  theHTML += '          </div>';
  theHTML += '          <span class="text">Join as:</span>';
  theHTML += '        </div>';
  theHTML += '        <input data-pats="student_radio_button" type="radio" name="role-' + rand + '" class="role_stud"/>';
  theHTML += '        <label>Student</label>';
  theHTML += '        <input data-pats="ta_radio_button" type="radio" name="role-' + rand + '" class="role_ta instructor_join"/>';
  theHTML += '        <label class="instructor_join">TA</label>';
  theHTML += '        <input data-pats="professor_radio_button" type="radio" name="role-' + rand + '" class="role_prof instructor_join"/>';
  theHTML += '        <label class="instructor_join">Professor</label>';
  theHTML += '        <p class="no_instructor_warning" style="display:none">Instructor self-enrollment has been disabled for this class.</p>';
  theHTML += '        <p class="warning">All other instructors in the class will be notified when you join as an Instructor.</p>';
  theHTML += '        <p class="error">Please select whether you\'d like to join as a student, TA, or professor for <span class="class_num">CLASSNUM</span>.</p>';
  theHTML += '      </div>';
  theHTML += '      <div class="create_class">';
  theHTML += '        <p class="error" style="margin-left:51px;font-weight:bold;display:none;margin-bottom:15px;font-size:13px;">Please finish creating your class</p>';
  theHTML += '        <div class="input_group long">';
  theHTML += '          <label>Course Name:</label>';
  theHTML += '          <input type="text" class="input-xlarge course_name_field">';
  theHTML += '          <p class="error">Please enter a valid course name</p>';
  theHTML += '          <p class="helper_text">Enter the full title of the course, so others can find it easily</p>';
  theHTML += '        </div>';
  theHTML += '        <div class="input_group">';
  theHTML += '          <label>Course Number:</label>';
  theHTML += '          <input type="text" class="input-small course_number_field">';
  theHTML += '          <p class="error">Please enter a valid course number</p>';
  theHTML += '          <p class="helper_text">Enter the course number associated with the class (e.g. CS 101).</p>';
  theHTML += '        </div>';
  theHTML += '        <div class="input_group">';
  theHTML += '          <label>Est. Enrollment:</label>';
  theHTML += '          <input type="text" class="input-small enrollment_field">';
  theHTML += '          <p class="error">Please enter a valid estimated enrollment value</p>';
  theHTML += '          <p class="helper_text">Enter the approximate/anticipated size of the class for this term.</p>';
  theHTML += '        </div>';
  theHTML += '        <div class="agreement">';
  theHTML += '          <p>by clicking <strong>Create Class</strong> you confirm that you are affiliated with ' + schoolName + ' per the <a href="/terms.html" target="_blank">Terms of Use</a></p>';
  theHTML += '          <button class="btn btn-primary">Create Class</button><button class="btn cancel">Cancel</button>';
  theHTML += '        </div>';
  theHTML += '      </div>';
  theHTML += '    </div>';
  theHTML += '  </div>';
  theHTML += '</div>';

  $("#new-classes").append(theHTML);
  classSectionBoxes += 1;
}

function renumberClassSectionBoxes() {
  $('#new-classes').find('.main .class_num').each(function(index) {
    var classNumber = prefilledClassBoxes + index + 1;
    $(this).html(classNumber);
  });
  $('#new-classes').find('.role .class_num').each(function(index) {
    var classNumber = prefilledClassBoxes + index + 1;
    $(this).html(classNumber);
  });
}

function populateClassSectionBoxes() {
  var numClasses = $("#new-classes .class").length;
  var numJoining = $("#new-classes .joining").length;
  var numCreating = $("#new-classes .creating").length;

  if ((numJoining + numCreating) > 0) {
    // TODO: future adjust the number of boxes intelligently
  } else {
    var numSections = 1;
    if (prefilledClassBoxes < maxClassSectionBoxes) {
      numSections = maxClassSectionBoxes - prefilledClassBoxes;
    }

    for (var i = 0; i < numSections; i++) {
      if (i == 0) {
        addClassSection(true);
      } else {
        addClassSection(false);
      }
    }
    $('.class.required .autosuggest input[type="text"]').focus();
  }
}

function showEnrollmentBox() {
  if (!enrollmentBoxDisabled) {
    //$('#enrollment').show();
    $('#enroll_btn').removeClass("disabled");
    $('#enroll_btn').removeAttr("disabled");
  }
}

function hideEnrollmentBox() {
  //$('#enrollment').hide();
  $('#enroll_btn').addClass("disabled");
  $('#enroll_btn').attr('disabled', 'true');
}

function clearEnrollmentStates() {
  var enrollmentBox = $("#enrollment");
  enrollmentBox.removeClass("enroll_button_state");
  enrollmentBox.removeClass("login_create_state");
  enrollmentBox.removeClass("validate_state");
  enrollmentBox.removeClass("login_state");
  enrollmentBox.removeClass("school_email_state");
}

$(document).ready(function() {

  if (!PA.ajaxLogin) {
    clearClassSections();
    populateClassSectionBoxes();
  }

  $('.add_more a').click(function() {
    addClassSection(false);
    $('#new-classes .class:last-child .autosuggest input[type="text"]').focus();
  });

  $('#new-classes').on('click', '.remove_class', function() {
    var theClass = $(this).closest('.class');
    var theClassId = theClass.attr('class_id');
    if (theClassId && selectedClasses[theClassId]) {
      selectedClasses[theClassId] = null;
    }
    theClass.remove();
    classSectionBoxes -= 1;
    renumberClassSectionBoxes();
  });

  if (fromDashboard) {
    showEnrollmentBox();
  }
});
