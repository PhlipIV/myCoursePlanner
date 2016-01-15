coursePlanner.controller('coursePlannerCtrl', function($scope, $http){

	/*
	course = {
		date
		subject
		section
	}
	*/

	var selectedCourses = []; // used right now for displaying the course list, maybe delete it later
	var testSlots = [];
	var currentSchedule = 0;
	var validSchedules = []; //a 2D array, each array represent a unique and valid selection of courses
	var timeslots = [] // ['0800','0830'...] this array keeps a string of times to use as id for the tr
	var weekdaysMap = {"M":2,"T":3,"W":4,"H":5,"F":6};
	var colorList = ['#81CFE0', '#87D37C', '#1BBC9B', '#E26A6A', '#E9D460', '#86E2D5', '#4B77BE', '#9B59B6'];
	var currentColor = 0;// track which color in colorList will be used
	
	var init = function(){

		$scope.changeScheduleLabel = "no schedule yet";
		for(var i = 8; i < 23; i++){
			if (i < 10){
				timeslots.push('0'+ i+'00');
				timeslots.push('0'+ i+'30');
			}
			else{
				timeslots.push(i+'00');
				timeslots.push(i+'30');
			}
		}
		clearTable();
	}

	function clearTable(){
		var tdClassMap = {1: "M", 2: "T", 3: "W", 4: "H", 5: "F"};
		currentColor = 0;
		$("#timetable-body").html("");
		for(var i = 0; i < timeslots.length; i++){
			var $tr = $('<tr id="'+ timeslots[i] +'"></tr>');
			for(var j = 0; j < 6; j++){
				var $td;
				if (j > 0){
					$td = $('<td class="'+ tdClassMap[j] +'"></td>');
				}
				else{
					$td = $('<td class="timeColumn"></td>');
				}
				$tr.append($td);
			}
			$("#timetable-body").append($tr);
		}
		var rowColorClass = "white"
		for(var i = 0; i < timeslots.length; i++){
			$('#'+timeslots[i]).addClass(rowColorClass);
			$('#'+timeslots[i]).children().first().html(timeslots[i].slice(0,-2) + ':' + timeslots[i].slice(-2)).attr('rowspan', 2);
			i++;
			$('#'+timeslots[i]).addClass(rowColorClass);
			$('#'+timeslots[i]).children().first().remove();
			if (rowColorClass === "white"){
				rowColorClass = "grey";
			}
			else{ 
				rowColorClass = "white";
			}
		}
	}

	function renderCourse(course){ // present a course onto the time table
		var startTime = course.date.start_time.replace(":", ""); // strip out the ':' to use as the id to the tr element
		
		//create the div element to contain the course
		var $classDiv = $('<div class="course"></div>');
		$classDiv.append($('<span>' + course.subject + '</span>'));
		$classDiv.append($('<span>' + course.section + '</span>'));
		$classDiv.css('background-color', colorList[currentColor]);
		if(!(course.section.substring(0, 3) === 'TUT')) { currentColor++; }

		var weekdays = course.date.weekdays.split("");
		var rowspan = calculateRowSpan(course);// calculate the row span of this course
		for (var i=0; i < weekdays.length; i++){// add the course element to the proper row
			$('#' + startTime + ' .' + weekdays[i]).attr('rowspan', rowspan).append($classDiv.clone());
		}

		// remove the extra td elements because of the row span
		var $row = $('#' + startTime );
		console.log(course.subject + " " + weekdays);
		for (var i = 1; i < rowspan; i++){
			$row = $row.next();
			for(var j = 0; j < weekdays.length; j++){
				$row.children('.' + weekdays[j]).remove();
			}
		}
	}

	function renderSchedule(){
		clearTable();
		for(var i = 0; i < validSchedules[currentSchedule].length; i++){
			renderCourse(validSchedules[currentSchedule][i]);
		}
		$scope.changeScheduleLabel = "schedule " + (currentSchedule+1)+'/'+validSchedules.length;
	}

	function calculateRowSpan(course){
		var start = course.date.start_time.split(':').map(Number);
		var end = course.date.end_time.split(':').map(Number);
		if (end[1] < start[1]){
			end[0] = end[0] - 1;
			end[1] = end[1] + 60;
		}
		return Math.ceil(((end[1] - start[1]) + 60 * (end[0] - start[0]))/30.0);
	}


	/**************************************************************************************************************/
	//this functino checks whether the courses have a test slot conflict, it is guaranteed that it will detect at least one conflict
	//if a conflict exists,  isSelectionPossible() returns false, else true;
	function isSelectionPossible(){
		testSlots.sort(compareCourseTime);
		for(var i = 0; i < testSlots.length-1; i++){
			if( doesOverlap(testSlots[i], testSlots[i+1]) ){
				return false;
			}
		}
		return true;
	}

	//this function takes in two date objects and check if they overlap
	function doesOverlap(date1, date2){// assume date1 is before date2
		if (date1.end_date != date2.start_date) { return false }
		else {
			/*var end_time = date1.end_time.split(':').map(Number);
			var start_time = date2.start_time.split(':').map(Number);
			if (end_time[0] < start_time[0]) { return false }
			else if ( end_time[0] == start_time[0] && end_time[1] < start_time[1]) { return false }*/
			if ((compareTimeValue(date1.start_time, date2.start_time, ':') <= 0) && (compareTimeValue(date2.start_time, date1.end_time, ':') < 0) ||
				(compareTimeValue(date1.start_time, date2.end_time, ':') < 0) && (compareTimeValue(date2.end_time, date1.end_time, ':') <= 0))
			{
				return true;;
			}
		}
		return false;
	}

	// this function and used to sort date objects, 
	function compareCourseTime(date1, date2){
		if (date1.start_date == date2.start_date && date1.start_time == date2.start_time){ return 0; }
		else if (date1.start_date != date2.start_date) { //compare date if date is different
			return compareTimeValue(date1.start_date, date2.start_date, '/');
		}
		else{ //if date is the same, start comparing time
			return compareTimeValue(date1.start_time, date2.start_time, ':');
		}
	}

	function compareTimeValue(t1, t2, seperator){
		var time1 = t1.split(seperator).map(Number);
		var time2 = t2.split(seperator).map(Number);
		if 		(time1[0] < time2[0]) { return -1 }
		else if (time1[0] > time2[0]) { return  1 }
		else if (time1[1] < time2[1]) { return -1 }
		else if (time1[1] > time2[1]) { return  1 }
		else                          { return  0 }
	}
	/**************************************************************************************************************/

	//this function takes in an array of sections for a course and recompute the schedule list with the new course included.
	//courseSections: array of sections
	function addCourseToSchedule(courseSections){

		//schedule: a array of courses that doesnt conflict with each other. for example [cs350, cs343, cs370]
		//course: a single course object that we will attempt to add to the schedule
		//scheduleList: an array of schedules. if the course is successfully added to the schedule, the new schedule will be pushed into scheduleList
		function addNewCourseToSchedule(schedule, course, scheduleList){
			var scheduleCopy = schedule.slice();
			for (var i = 0; i < scheduleCopy.length; i++){// traverse through each course in the schedule and check for conflict
				var courseDate = scheduleCopy[i].date;
				var newCourseDate = course.date;
				//console.log("weekday1: "+ courseDate.weekdays +" weekday2: "+ newCourseDate.weekdays);
				//console.log(compareTimeValue(newCourseDate.start_time, courseDate.end_time, ':'));
				//console.log(compareTimeValue(courseDate.start_time, newCourseDate.end_time, ':'));
				if (isTwoCoursesOnSameDay(courseDate.weekdays, newCourseDate.weekdays)){
					/*if ((compareTimeValue(courseDate.start_time, newCourseDate.start_time, ':') <= 0) && (compareTimeValue(newCourseDate.start_time, courseDate.end_time, ':') < 0) ||
						(compareTimeValue(courseDate.start_time, newCourseDate.end_time, ':') < 0) && (compareTimeValue(newCourseDate.end_time, courseDate.end_time, ':') <= 0))
					{
						return;
					}*/
					if(doesOverlap(courseDate, newCourseDate)){
						return;
					}
				}
			}
			scheduleCopy.push(course);
			scheduleList.push(scheduleCopy);
		}

		// give the weekdays property of a coursedate, determine if two courses occur on the same day
		function isTwoCoursesOnSameDay(weekdays1, weekdays2){
			var weekdays = ["M","T","W","H","F"];
			for(var i = 0; i < weekdays.length; i++){
				if((weekdays1.indexOf(weekdays[i]) > -1) && (weekdays2.indexOf(weekdays[i]) > -1)){ return true;}
			}
			return false;
		}


		var newValidSchedules = [];// this array will contain all new schedules after the course has been added
		if (validSchedules.length === 0){// if no course has been added, add the course as an array of single item
			for(var i = 0; i < courseSections.length; i++){
				validSchedules.push([courseSections[i]]);
			}
			return;
		}

		//for each course and schedule combination, check if the course can be added to the schedule
		for(var i = 0; i < courseSections.length; i++){
			for(var j = 0; j < validSchedules.length; j++){
				//console.log("adding " + courseSections[i].subject + " "+ courseSections[i].section + " to "+ validSchedules[j].map(function(obj){return (obj.subject + obj.section)}));
				addNewCourseToSchedule(validSchedules[j], courseSections[i], newValidSchedules);
			}
		}

		// 
		if (newValidSchedules.length === 0){
			alert(courseSections[0].subject + " conflicts with other courses");
		}
		else{
			validSchedules = newValidSchedules.slice();// validSchedules equals the copy of newValidSchedules
		}
	}



	$scope.addCourse = function(){
		var course = $scope.course;
		$scope.course ="";
		$(':input').val(""); // clear the input
		if (!course){ //return if nothing is entered
			return;
		}
		var courseName = "";
		var courseID = "";
		for(var i = 0; i < course.length; i++){
			if (!isNaN(course[i])){
				courseName = course.substring(0, i).toUpperCase();
				courseID = course.substring(i);
				break;
			}
		}
		if(selectedCourses.indexOf(courseName+courseID) > -1){
			alert(courseName+courseID + " is already added to the time table.");
			return;
		}
		var key = '0c9e72cc9a9f79be6a0104760c9f568a';
		var term = 1161;
		var req = {
    		method: 'GET',
    		url: 'https://api.uwaterloo.ca/v2/courses/'+ courseName +'/'+ courseID +'/schedule.json',
    		params: {
    			key: key,
    			term: term
    		}
		}
		$http(req).then(function(response){
			console.log(response)
			if (response.status === 204){
				alert("no course found");
			}
			else{
				var sections = response.data.data;
				console.log(sections);
				if(sections.length === 0){
					alert('course ' + courseName+courseID + ' does not exist.');
					return;
				}
				var courses = [];
				var tutorials = [];
				for(var i = 0; i < sections.length; i++){
					if (sections[i].section.substring(0, 3) === 'TST'){
						testSlots.push(sections[i]['classes'][0].date);
						if(!isSelectionPossible()){
							testSlots.pop();
							alert("There exists a test slot conflict for course " + courseName+courseID + "!");
							return;
						}
						break;
					}
					else if(sections[i].campus === "ONLN ONLINE"){
						continue;
					}
					else{
						console.log(i)
						sections[i]['classes'][0].date.weekdays = sections[i]['classes'][0].date.weekdays.replace("Th", "H") // use H to represent thursday so the letters are unique
						if (sections[i].section.substring(0, 3) === 'TUT'){
							tutorials.push({
								subject: courseName+courseID,
								section: sections[i].section,
								date: sections[i]['classes'][0].date
							});
						}
						else{
							courses.push({
								subject: courseName+courseID,
								section: sections[i].section,
								date: sections[i]['classes'][0].date
							});
						}
					}
				}
				
				selectedCourses.push(courseName+courseID);
				if (tutorials.length > 0){
					addCourseToSchedule(tutorials);
				}
				addCourseToSchedule(courses);
				renderSchedule();
				console.log(sections);
			}
		},function(response){
			console.log(response);
		});
	}

	$scope.changeSchedule = function(){
		if(validSchedules.length === 0){
			return;
		}
		currentSchedule++;
		if (currentSchedule == validSchedules.length){
			currentSchedule = 0;
		}
		renderSchedule();
	}

	$scope.removeAll = function(){
		if(validSchedules.length === 0){
			return;
		}
		validSchedules = [];
		currentColor = 0;
		testSlots = [];
		currentSchedule = 0;
		$scope.changeScheduleLabel = "no schedule yet";
		selectedCourses = []
		clearTable();
	}
	init();
});