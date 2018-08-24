// --- By Geo Magadan | nepotu.ro --- //
// ---      version 1.0-RC0      --- //
(function () {
    "use strict";

    // --- Utils --- //
    const has = Object.prototype.hasOwnProperty;

    // Add leading zero to numbers below 10
    function zeroPad(n) {
        return (n < 10) ? ("0" + n) : n;
    }

    // Trunc decimals or return 0 for empty input
    function truncDecimals(value, precision) {
        var decimals = (parseFloat(precision) || 0);
        return Number(Math.round((parseFloat(value) || 0) + "e" + decimals) + "e-" + decimals);
    }

    // Count how many objects have the property checked = true
    function checkedCount(obj) {
        var cc = 0;
        if (typeof obj == "object") {
            cc = obj.reduce(function (pVal, cObj) {
                return pVal + (cObj.checked ? 1 : 0);
            }, 0);
        }
        return cc;
    }

    // Serialize cyclic object
    function decycleObject(obj) {
        var seen = [];
        var newObj = {};
        if (typeof obj == "object") {
            newObj = JSON.stringify(obj, function (key, val) {
                if (typeof val == "object") {
                    if (seen.indexOf(val) >= 0) return;
                    seen.push(val);
                }
                return val;
            });
        }
        return JSON.parse(newObj);
    }

    // Convert string to object
    function stringToObject(strObj) {
        var newObj = {};
        try {
            if (typeof strObj != "object" && typeof strObj != "undefined") {
                // convert string to JSON
                newObj = JSON.parse(strObj);
            } else if (typeof strObj == "object") {
                // Convert to string then parse, to avoid issues caused by object pointers
                newObj = JSON.parse(JSON.stringify(strObj));
            }
        } catch (e) {
            return {};
        }
        return newObj;
    }

    // Update checked property in radio/checkbox object
    function updateObject(selectedObj, parentObj, checkboxMode) {
        try {
            if (typeof selectedObj.checked != "boolean") {
                selectedObj.checked = (selectedObj.checked == "true");
            }
            // Simulate radio button
            if (!checkboxMode) {
                parentObj.forEach(function (obj) {
                    if (obj.setItem == selectedObj.setItem) {
                        obj.checked = true;
                    } else {
                        obj.checked = false;
                    }
                });
            } else {
                // At least one item should be checked
                if (checkedCount(parentObj) == 0) {
                    selectedObj.checked = true;
                }
            }
        } catch (e) {
            return {};
        }
    }

    // Function to sort the object containing the heating schedule
    // based on json.sortify: https://www.npmjs.com/package/json.sortify
    function objSortKeys(o) {
        if (Array.isArray(o)) {
            return o.map(objSortKeys);
        } else if (o instanceof Object) {
            var _ret = function () {
                var numeric = [];
                var nonNumeric = [];
                Object.keys(o).forEach(function (key) {
                    if (/^(0|[1-9][0-9]*)$/.test(key)) {
                        numeric.push(+key);
                    } else {
                        nonNumeric.push(key);
                    }
                });
                return {
                    v: numeric.sort(function (a, b) {
                        return a - b;
                    }).concat(nonNumeric.sort()).reduce(function (result, key) {
                        result[key] = objSortKeys(o[key]);
                        return result;
                    }, {})
                };
            }();
            if (typeof _ret === "object") return _ret.v;
        }
        return o;
    }

    // --- Constructors --- //

    // OHS Config - store scheduler and view parameters
    function OHSConfig() {
        // Init configuration object
        // tabIdx: 0 - Status, 1 - Schedule, 2 - AddEdit
        var ohsConf = {
            debug: false,
            initComplete: false,
            items: 0,
            multiSel: true,
            edit: false,
            statusHidden: false,
            statusLocked: false,
            runningModeHidden: false,
            defTabIdx: 0,
            tabIdx: 0,
            type: "",
            storeItem: "",
            selItem: "",
            selItemLabel: "",
            selDay: "",
            selTime: "",
            modeItem: "",
            modes: [],
            runningMode: "",
            manual: "MANUAL",
            knobWatchOn: false,
            knobReadOnly: false,
            version: "1.0-RC0"
        };

        this.setConf = setConf;
        this.getConf = getConf;

        //////////

        function setConf(prop, val) {
            if (has.call(ohsConf, prop)) {
                if (typeof ohsConf[prop] === typeof val) {
                    ohsConf[prop] = val;
                }
            }
        };

        function getConf() {
            return ohsConf;
        };
    }

    // OHS Time
    function OHSTime() {
        // Defaults to current hour
        var currentTime = new Date();
        currentTime.setMinutes(0);

        // Init time object
        var ohsTime = {
            hstep: 1,
            mstep: 5,
            time: currentTime,
            duration: 60
        };

        this.setTimeProp = setTimeProp;
        this.setDuration = setDuration;
        this.getTime = getTime;

        //////////

        function setTimeProp(prop, val) {
            if (prop == "time") {
                var now = new Date();
                if (val) {
                    // time - format THHMM
                    now.setHours(parseFloat(val.substring(1, 3)));
                    now.setMinutes(parseFloat(val.substring(3, 5)));
                } else {
                    now.setMinutes(0);
                }
                ohsTime.time = new Date(now);
            } else if (val) {
                ohsTime[prop] = val;
            }
        };

        // Update duration
        function setDuration(value) {
            var newDuation = 0;
            switch (parseFloat(value) || 0) {
            case -1:
                newDuation = truncDecimals(ohsTime.duration - ohsTime.mstep, 0);
                break;
            case 1:
                newDuation = truncDecimals(ohsTime.duration + ohsTime.mstep, 0);
                break;
            default:
                newDuation = truncDecimals(parseFloat(value) || ohsTime.duration, 0);
            }
            // Failsafe: defaults to 1 minute if duration is less than 1 minute
            if (newDuation < 1) {
                newDuation = 1;
            }
            ohsTime.duration = newDuation;
        };

        function getTime() {
            return ohsTime;
        };
    }

    // OHS Temperature
    function OHSTemperature() {
        // Init temperature object
        var ohsTemp = {
            unit: "°C",
            step: 1,
            min: 18,
            max: 30,
            set: 23,
            scaleQty: 12,
            decimals: 0
        };

        this.setTempProp = setTempProp;
        this.getTemp = getTemp;

        //////////

        function setTempProp(prop, val) {
            if (prop == "unit") {
                ohsTemp[prop] = val;
            } else if (parseFloat(val) >= 0) {
                ohsTemp[prop] = (prop == "step" || prop == "decimals" || prop == "scaleQty") ? parseFloat(val) : truncDecimals(val, ohsTemp.decimals);
            }
        };

        function getTemp() {
            return ohsTemp;
        };
    }

    // OHS Week Days
    function OHSDays() {
        // Init week days
        var ohsDays = [{
            setItem: "D1",
            label: "Monday",
            shortLabel: "Mon",
            checked: false
        }, {
            setItem: "D2",
            label: "Tuesday",
            shortLabel: "Tue",
            checked: false
        }, {
            setItem: "D3",
            label: "Wednesday",
            shortLabel: "Wed",
            checked: false
        }, {
            setItem: "D4",
            label: "Thursday",
            shortLabel: "Thu",
            checked: false
        }, {
            setItem: "D5",
            label: "Friday",
            shortLabel: "Fri",
            checked: false
        }, {
            setItem: "D6",
            label: "Saturday",
            shortLabel: "Sat",
            checked: false
        }, {
            setItem: "D7",
            label: "Sunday",
            shortLabel: "Sun",
            checked: false
        }];

        this.setDays = setDays;
        this.selectToday = selectToday;
        this.getDays = getDays;

        //////////

        function setDays(selectedDay, multiSelect) {
            updateObject(selectedDay, ohsDays, multiSelect);
        };

        // Function to select the current week day
        function selectToday() {
            var currentDate = new Date();
            var currentDay = currentDate.getDay();
            currentDay = (currentDay == 0) ? 7 : currentDay;
            updateObject({
                "setItem": "D" + currentDay,
                "checked": true
            }, ohsDays, false);
        };

        function getDays() {
            return ohsDays;
        };
    }

    // OHS Items
    function OHSItems() {
        var ohsItems = [];

        this.initItems = initItems;
        this.setItemModel = setItemModel;
        this.selectItem = selectItem;
        this.getFirstItem = getFirstItem;
        this.selectFirstItem = selectFirstItem;
        this.getItems = getItems;

        //////////

        // Init the items array of objects
        function initItems(itemsToLoad, itemsType) {
            ohsItems = stringToObject(itemsToLoad);
            // Add "checked" property to each item
            Object.keys(ohsItems).forEach(function (itemKey) {
                var ohsItem = ohsItems[itemKey];
                if (!has.call(ohsItem, "checked")) {
                    ohsItem.checked = false;
                }
                if (itemsType == "OnOff" && !has.call(ohsItem, "model")) {
                    ohsItem.model = {
                        name: ohsItem.label,
                        item: ohsItem.setItem,
                        hidelabel: false,
                        hideicon: false,
                        hideonoff: true,
                        backdrop_center: true,
                        iconset: "smarthome-set",
                        icon: "power-button",
                        icon_size: 64,
                        type: "switch"
                    };
                }
            });
        };

        // Update item.model property
        function setItemModel(item, prop, val) {
            var setItemName = (typeof item == "object") ? item.setItem : item;
            Object.keys(ohsItems).forEach(function (itemKey) {
                var ohsItem = ohsItems[itemKey];
                if (ohsItem.setItem == setItemName) {
                    if (has.call(ohsItem, "model")) {
                        ohsItem.model[prop] = val;
                    }
                }
            });
        };

        // Select item: checked = true
        function selectItem(item, multiSelect) {
            updateObject(item, ohsItems, multiSelect);
        };

        // Select the first item in the list
        function selectFirstItem() {
            updateObject(getFirstItem(), ohsItems, false);
        };

        // Return the first from the array
        function getFirstItem() {
            return (typeof ohsItems[0] == "object") ? ohsItems[0] : {
                "setItem": "",
                "readItem": "",
                "label": ""
            };
        };

        function getItems() {
            return ohsItems;
        };

    }

    // OHS Items' Schedule
    function OHSSchedule() {
        var ohsSchedule = {};

        this.initSchedule = initSchedule;
        this.addUpdateSchedule = addUpdateSchedule;
        this.deleteSchedule = deleteSchedule;
        this.getSchedule = getSchedule;

        //////////

        // Init the schedule object
        function initSchedule(schedule) {
            ohsSchedule = stringToObject(schedule);
        };

        function addUpdateSchedule(scheduleItem, scheduleDay, scheduleTime, scheduleValue) {
            // Add empty item object if not present
            if (!ohsSchedule[scheduleItem]) {
                ohsSchedule[scheduleItem] = {};
            }
            // Add empty child day object if not present
            if (!ohsSchedule[scheduleItem][scheduleDay]) {
                ohsSchedule[scheduleItem][scheduleDay] = {};
            }
            // Add/Update time and assign value
            ohsSchedule[scheduleItem][scheduleDay][scheduleTime] = scheduleValue;
            // Sort object by keys
            ohsSchedule = objSortKeys(ohsSchedule);
        };

        function deleteSchedule(scheduleItem, scheduleDay, scheduleTime) {
            if (scheduleItem && scheduleDay && scheduleTime) {
                delete ohsSchedule[scheduleItem][scheduleDay][scheduleTime];
            } else if (scheduleItem && scheduleDay) {
                delete ohsSchedule[scheduleItem][scheduleDay];
            } else if (scheduleItem) {
                delete ohsSchedule[scheduleItem];
            }
        };

        function getSchedule(itemName) {
            if (itemName) {
                if (has.call(ohsSchedule, itemName)) {
                    return ohsSchedule[itemName];
                } else {
                    return {};
                }
            }
            return ohsSchedule;
        };
    }

    // OHS Knobs
    function OHSKnobs() {

        var ohsKnobs = {};
        var set, step, unit, min, max, scaleQty, decimals;

        this.initKnobs = initKnobs;
        this.setKnobs = setKnobs;
        this.getKnobs = getKnobs;

        //////////

        // First knob object with the key = setTemp is used on the Add/Edit tab
        function initKnobs(setVal, stepVal, unitVal, decimalsVal, minVal, maxVal, scaleQtyVal) {
            set = (setVal || 23);
            step = (stepVal || 1);
            unit = (unitVal || "°C");
            decimals = (decimalsVal || 0);
            min = (minVal || 18);
            max = (maxVal || 30);
            scaleQty = (scaleQtyVal || 12);
            ohsKnobs = {
                setTemp: {
                    options: {
                        skin: {
                            type: "tron",
                            width: 5,
                            color: "#AABBCC",
                            spaceWidth: 3
                        },
                        scale: {
                            enabled: true,
                            type: "dots",
                            color: "#FF3333",
                            width: 2,
                            quantity: scaleQty,
                            spaceWidth: 5,
                            height: 6
                        },
                        rangesEnabled: false,
                        readOnly: false,
                        trackWidth: 40,
                        trackColor: "rgba(52,152,219, 0.1)",
                        barWidth: 40,
                        startAngle: 0,
                        endAngle: 360,
                        fontSize: "30",
                        dynamicOptions: true,
                        subText: {
                            enabled: false,
                            text: "Set: " + set + " " + unit
                        },
                        step: step,
                        min: min,
                        max: max,
                        unit: unit
                    },
                    value: set
                }
            };
        };

        function setKnobs(member, option, optionValue) {
            if (member != "setTemp" && typeof ohsKnobs[member] != "object") {
                var newMember = {};
                newMember[member] = JSON.parse(JSON.stringify(ohsKnobs["setTemp"]));
                ohsKnobs = Object.assign(ohsKnobs, newMember);
            }
            if (option == "value") {
                ohsKnobs[member][option] = truncDecimals(optionValue, decimals);
            } else if (option == "setItem" || option == "label") {
                ohsKnobs[member][option] = optionValue;
            } else if (option == "subText" && truncDecimals(optionValue, decimals) > 0) {
                ohsKnobs[member]["options"][option]["text"] = "Set: " + truncDecimals(optionValue, decimals) + " " + unit;
                ohsKnobs[member]["options"][option]["enabled"] = true;
            } else {
                ohsKnobs[member]["options"][option] = optionValue;
            }
        };

        function getKnobs() {
            return ohsKnobs;
        };

    };

    // OHS Timeline
    function OHSTimeline() {
        var ohsTimeline = {};

        this.initTimeline = initTimeline;
        this.getTimeline = getTimeline;

        //////////

        function initTimeline(days, itemSchedule, unit) {
            // Use UTC for dates
            var utcOffset = vis.moment.parseZone().utcOffset();
            var today = vis.moment.utc();
            var startDate = today.clone();
            var endDate = today.clone();
            var timelineGroups = new vis.DataSet();
            var timelineItems = new vis.DataSet();
            var i = 0;
            // Set interval start and end time to current day
            startDate = startDate.set({
                hour: 0,
                minute: 0,
                second: 0,
                millisecond: 0
            });
            //startDate = startDate.utcOffset(utcOffset);
            endDate = endDate.set({
                hour: 23,
                minute: 59,
                second: 59,
                millisecond: 999
            });
            //endDate = endDate.utcOffset(utcOffset);
            // Build groups and items
            Object.keys(days).forEach(function (dayKey) {
                var day = days[dayKey];
                // Build a group for each day
                timelineGroups.add({
                    id: parseFloat(day.setItem.substring(1, 2)),
                    content: day.shortLabel
                });
                // Build items array
                if (has.call(itemSchedule, day.setItem)) {
                    Object.keys(itemSchedule[day.setItem]).forEach(function (schedTime) {
                        i++;
                        var itemDate = today.clone();
                        var itemHour = parseFloat(schedTime.substring(1, 3));
                        var itemMinute = parseFloat(schedTime.substring(3, 5));
                        itemDate = itemDate.set({
                            hour: itemHour,
                            minute: itemMinute,
                            second: 0,
                            millisecond: 0
                        });
                        // itemDate = itemDate.utcOffset(utcOffset);
                        timelineItems.add({
                            id: i,
                            group: parseFloat(day.setItem.substring(1, 2)),
                            content: parseFloat(itemSchedule[day.setItem][schedTime]) + (unit || " '"),
                            start: itemDate,
                            schedule: {
                                day: day.setItem,
                                time: schedTime,
                                value: parseFloat(itemSchedule[day.setItem][schedTime])
                            }
                        });
                    });
                }
            });
            // Merge all timeline objects together
            ohsTimeline = {
                data: {
                    items: timelineItems,
                    groups: timelineGroups
                },
                options: {
                    type: "point",
                    align: "right",
                    editable: false,
                    showTooltips: false,
                    showCurrentTime: false,
                    snap: null,
                    stack: false,
                    verticalScroll: false,
                    horizontalScroll: true,
                    orientation: {
                        axis: "both"
                    },
                    moment: function moment(date) {
                        return vis.moment(date).utc();
                    },
                    zoomMin: 21600000,
                    zoomMax: 86400000,
                    min: startDate,
                    max: endDate,
                    start: startDate,
                    end: endDate,
                    format: {
                        minorLabels: {
                            millisecond: "",
                            second: "",
                            minute: "HH:mm",
                            hour: "HH:mm",
                            weekday: "",
                            day: "",
                            week: "",
                            month: "",
                            year: ""
                        },
                        majorLabels: {
                            millisecond: "",
                            second: "",
                            minute: "",
                            hour: "",
                            weekday: "",
                            day: "",
                            week: "",
                            month: "",
                            year: ""
                        }
                    }
                },
                loaded: true
            };
        };

        function getTimeline(itemName, group) {
            if (itemName) {
                if (has.call(ohsTimeline.data.items["_data"], itemName)) {
                    return ohsTimeline.data.items["_data"][itemName]["schedule"];
                } else {
                    return {};
                }
            }
            return ohsTimeline;
        };
    }

    // --- AngularJS --- //

    angular
        .module("app.widgets")
        .filter("capitalize", capitalize)
        .directive("widgetScheduler", widgetScheduler)
        .controller("OHSchedMainCtl", OHSchedMainCtl);

    // --- Custom Filters --- //

    // Function to capitalize text
    // reg: /([^\W_]+[^\s-]*) */g : /([^\W_]+[^\s-]*)/
    function capitalize() {
        function filter(input) {
            if (input !== null) {
                return input.replace(/\w\S*/g, function (txt) {
                    try {
                        return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
                    } catch (e) {
                        return;
                    }
                });
            }
        }
        return filter;
    };

    // --- Directives --- //

    // widgetScheduler Function
    function widgetScheduler() {
        var directive = {
            bindToController: true,
            controller: OHSchedMainCtl,
            controllerAs: "ohs",
            link: link,
            restrict: "E",
            templateUrl: "/static/habpanel/scheduler/ohscheduler.tpl.html",
            scope: {
                conf: "@"
            }
        };
        return directive;

        function link(scope, element, attrs) {}
    };

    // --- Factories --- //

    // --- Services --- //

    // --- Controllers --- //

    // OH Scheduler Main Controller
    OHSchedMainCtl.$inject = ["$rootScope", "$scope", "$timeout", "$filter", "OHService"];

    function OHSchedMainCtl($rootScope, $scope, $timeout, $filter, OHService) {
        var ohs = this; // Controller as

        ohs.$rootScope = $rootScope;
        ohs.$scope = $scope;
        ohs.$timeout = $timeout;
        ohs.$filter = $filter;
        ohs.OHService = OHService;
        ohs.ohsConf = new OHSConfig();
        ohs.ohsDays = new OHSDays();
        ohs.ohsItemsList = new OHSItems();
        ohs.ohsTime = new OHSTime();
        ohs.ohsTemp = new OHSTemperature();
        ohs.ohsKnobs = new OHSKnobs();
        ohs.ohsSchedule = new OHSSchedule();
        ohs.ohsTimeline = new OHSTimeline();
        ohs.ohsTimelineTools = {
            object: null,
            item: "",
            group: ""
        };

        this.itemState = ohs._itemState;
        this.getTimelineEvents = ohs._getTimelineEvents;
        this.updateKnobValue = ohs._updateKnobValue;
        this.selectItem = ohs._selectItem;
        this.selectDay = ohs._selectDay;
        this.updateDuration = ohs._updateDuration;
        this.changeRunningMode = ohs._changeMode;
        this.changeViewTab = ohs._changeTab;
        this.addOrUpdateSchedule = ohs._addOrUpdateSchedule;
        this.deleteSchedule = ohs._deleteSchedule;
        this.stepWindow = ohs._stepWindow;
        this.zoomWindow = ohs._zoomWindow;

        //////

        // Init objects
        function initOHS() {
            ohs.conf = ohs.ohsConf.getConf();
            ohs.days = ohs.ohsDays.getDays();
            ohs.itemsList = ohs.ohsItemsList.getItems();
            ohs.time = ohs.ohsTime.getTime();
            if (ohs.ohsConf.getConf().type == "Thermostat") {
                ohs.knobs = ohs.ohsKnobs.getKnobs();
                ohs.temp = ohs.ohsTemp.getTemp();
            };
            ohs.timeline = ohs.ohsTimeline.getTimeline();
            // Watch timeline events
            ohs.timelineEvents = ohs.getTimelineEvents();
            // If status visible, then enable knob watch/get switch status
            if (ohs.ohsConf.getConf().defTabIdx == 0 && !ohs.ohsConf.getConf().statusHidden) {
                if (ohs.ohsConf.getConf().type == "Thermostat") {
                    // Unsuspend Knob watch
                    $timeout(function () {
                        ohs.ohsConf.setConf("knobWatchOn", true);
                    }, 100);
                } else if (ohs.ohsConf.getConf().type == "OnOff") {
                    // Temporary fix for widget switch initial state issue. Alternative reload items: OHService.reloadItems();
                    $timeout(function () {
                        $rootScope.$emit('openhab-update');
                    }, 500);
                }
            }
        }

        // --- Controller $watch/$on listeners --- //

        // Track Knob changes - wait 1000 ms to be sure that the last change is captured before actually changing the target temperature
        // watchOn is to ensure that the watch is not fired on knob changes performed on watchEventSource - SSE
        // ui-knob does not support ng-change
        $scope.$watch(function () {
            return ohs.knobs;
        }, function (newKnob, oldKnob) {
            if (ohs.ohsConf.getConf().type == "Thermostat" && ohs.ohsConf.getConf().tabIdx == 0 && oldKnob && ohs.ohsConf.getConf().knobWatchOn) {
                var loopOn = true;
                var knobTimeout;
                $timeout.cancel(knobTimeout);
                knobTimeout = $timeout(function () {
                    var items = ohs.ohsItemsList.getItems();
                    Object.keys(items).forEach(function (itemKey) {
                        var item = items[itemKey];
                        if (newKnob[item.readItem].value != oldKnob[item.readItem].value && loopOn) {
                            OHService.sendCmd(item.setItem, newKnob[item.readItem].value.toString());
                            loopOn = false;
                        }
                    });
                }, 1000);
            }
        }, true);

        //  Listen on item/model changes
        var modelListener = $rootScope.$on('ohscheduler-update', function (event, data) {
            if (data == "timeline") {
                ohs.timeline = ohs.ohsTimeline.getTimeline();
            }
        });

        var itemListener = $rootScope.$on('openhab-update', function (event, data) {
            if (has.call((data || {}), "name")) {
                ohs._ohsRefresh(data.name);
            }
        });

        $scope.$on("$destroy", function () {
            modelListener();
            itemListener();
        });

        // --- Controller Init --- //

        // Load widget settins
        ohs._initOHSched(this.conf);

        // Init model after 100ms to be sure that everything is loaded/ready
        $timeout(function () {
            initOHS();
        }, 100);

    };

    // OH Scheduler Main Controller - Functions //

    // Init controller
    OHSchedMainCtl.prototype._initOHSched = function _initOHSched(config) {
        var vm = this;
        if (config) {
            var initOHSData = stringToObject(config);
            // Load OH Schelude parameters and init model objects
            initOHSData["type"] !== undefined && vm.ohsConf.setConf("type", initOHSData["type"]);
            initOHSData["storeItem"] !== undefined && vm.ohsConf.setConf("storeItem", initOHSData["storeItem"]);
            initOHSData["debug"] !== undefined && vm.ohsConf.setConf("debug", initOHSData["debug"]);
            if (initOHSData["statusHidden"]) {
                vm.ohsConf.setConf("statusHidden", true);
                // If Status tab (0) is hidden, then the default tab is the Schedule tab (1)
                vm.ohsConf.setConf("defTabIdx", 1);
                vm.ohsConf.setConf("tabIdx", 1);
            }
            if (initOHSData["statusLocked"]) {
                vm.ohsConf.setConf("statusLocked", true);
                // The knobs are readOnly
                vm.ohsConf.setConf("knobReadOnly", true);
            }
            // Load runningMode item and state
            if (initOHSData["modeItem"]) {
                vm.ohsConf.setConf("modeItem", initOHSData["modeItem"]);
                // Load runningMode item and state
                vm.ohsConf.setConf("runningMode", vm.itemState(initOHSData["modeItem"], false));
            }
            if (!initOHSData["runningModeHidden"]) {
                // Load running modes
                var modes = [];
                try {
                    modes = (initOHSData["modes"] != "") ? JSON.parse(initOHSData["modes"]) : [];
                } catch (e) {
                    modes = [];
                }
                // If the modes array is not defined use the default values
                if (modes.length == 0) {
                    if (initOHSData["type"] == "Thermostat") {
                        modes = ["OFF", "MANUAL", "AUTO", "COOL", "HEAT"];
                    } else if (initOHSData["type"] == "OnOff") {
                        modes = ["MANUAL", "SCHEDULE"];
                    }
                }
                vm.ohsConf.setConf("modes", modes);
            } else {
                vm.ohsConf.setConf("runningModeHidden", true);
            }
            // Load items
            if (initOHSData["itemsList"]) {
                vm.ohsItemsList.initItems(initOHSData["itemsList"], vm.ohsConf.getConf().type);
                // Set the number of items
                vm.ohsConf.setConf("items", Object.keys(vm.ohsItemsList.getItems()).length);
            }
            // Load the time control
            initOHSData["hStep"] !== undefined && vm.ohsTime.setTimeProp("hstep", initOHSData["hStep"]);
            initOHSData["mStep"] !== undefined && vm.ohsTime.setTimeProp("mstep", initOHSData["mStep"]);
            // Load temp control and knob(s) options
            if (initOHSData["type"] == "Thermostat") {
                // Load temp control
                var decimals = 1;
                initOHSData["tempUnit"] !== undefined && vm.ohsTemp.setTempProp("unit", initOHSData["tempUnit"]);
                initOHSData["tempMin"] !== undefined && vm.ohsTemp.setTempProp("min", initOHSData["tempMin"]);
                initOHSData["tempMax"] !== undefined && vm.ohsTemp.setTempProp("max", initOHSData["tempMax"]);
                initOHSData["tempSet"] !== undefined && vm.ohsTemp.setTempProp("set", initOHSData["tempSet"]);
                if (initOHSData["tempStep"]) {
                    vm.ohsTemp.setTempProp("step", initOHSData["tempStep"]);
                    decimals = (parseFloat(initOHSData["tempStep"]) == 1) ? 0 : 1;
                    vm.ohsTemp.setTempProp("decimals", decimals);
                }
                vm.ohsTemp.setTempProp("scaleQty", (Math.abs(vm.ohsTemp.getTemp().max - vm.ohsTemp.getTemp().min) / vm.ohsTemp.getTemp().step));
                // Init the SetTemp knob: initKnobs(setVal, stepVal, unitVal, decimalsVal, minVal, maxVal, scaleQtyVal)
                vm.ohsKnobs.initKnobs(vm.ohsTemp.getTemp().set, vm.ohsTemp.getTemp().step, vm.ohsTemp.getTemp().unit, vm.ohsTemp.getTemp().decimals, vm.ohsTemp.getTemp().min, vm.ohsTemp.getTemp().max, vm.ohsTemp.getTemp().scaleQty);
                // Load/create a knob for each item
                if (vm.ohsConf.getConf().items > 0) {
                    var items = vm.ohsItemsList.getItems();
                    Object.keys(items).forEach(function (itemKey) {
                        var item = items[itemKey];
                        vm.ohsKnobs.setKnobs(item.readItem, "setItem", item.setItem);
                        vm.ohsKnobs.setKnobs(item.readItem, "label", item.label);
                        // The knob.value and knob.options.subText will be updated on page rendering by vm._updateKnobValue()
                    });
                }
            }
            // Select 1st item
            vm.ohsItemsList.selectFirstItem();
            vm.ohsConf.setConf("selItem", vm.ohsItemsList.getFirstItem().setItem);
            vm.ohsConf.setConf("selItemLabel", vm.ohsItemsList.getFirstItem().label);
            // Select current day and hour
            vm.ohsDays.selectToday();
            vm.ohsTime.setTimeProp("time");
            // Load schedule
            if (vm.ohsConf.getConf().tabIdx == 1) {
                vm._refreshSchedule();
            }
            // Init complete
            vm.ohsConf.setConf("initComplete", true);
            // Debug to console?
            if (vm.ohsConf.getConf().debug) {
                vm._printOHSObjects();
            }
        }
    }

    // Print Objects to console
    OHSchedMainCtl.prototype._printOHSObjects = function _printOHSObjects() {
        var vm = this;
        console.log("ohsConf: " + JSON.stringify(vm.ohsConf.getConf(), null, 4));
        console.log("ohsItemsList: " + JSON.stringify(vm.ohsItemsList.getItems(), null, 4));
        console.log("ohsDays: " + JSON.stringify(vm.ohsDays.getDays(), null, 4));
        console.log("ohsTime: " + JSON.stringify(vm.ohsTime.getTime(), null, 4));
        if (vm.ohsConf.getConf().type == "Thermostat") {
            console.log("ohsTemp: " + JSON.stringify(vm.ohsTemp.getTemp(), null, 4));
            console.log("ohsKnobs: " + JSON.stringify(vm.ohsKnobs.getKnobs(), null, 4));
        }
        console.log("ohsSchedule: " + JSON.stringify(vm.ohsSchedule.getSchedule(), null, 4));
        console.log("ohsTimeline: " + JSON.stringify(vm.ohsTimeline.getTimeline(), null, 4));
        console.log("ohsTimelineTools: " + JSON.stringify(decycleObject(vm.ohsTimelineTools), null, 4));
    }

    // Get itemState source: template.widget.js
    OHSchedMainCtl.prototype._itemState = function _itemState(itemname, ignoreTransform) {
        var vm = this;
        if (!itemname) return "N/A";
        var item = vm.OHService.getItem(itemname);
        if (!item) return "N/A";
        var value = (item.transformedState && !ignoreTransform) ? item.transformedState : item.state;
        return value;
    }

    // Change the running mode
    OHSchedMainCtl.prototype._changeMode = function _changeMode(mode) {
        var vm = this;
        // Suspend Knob watch
        vm.ohsConf.setConf("knobWatchOn", false);
        if (vm.ohsConf.getConf().type == "Thermostat") {
            if (mode == vm.ohsConf.getConf().manual) {
                vm.ohsConf.setConf("knobReadOnly", false);
                vm.ohsConf.setConf("edit", false);
                // Change to Status/Schedule tab
                vm.ohsConf.setConf("tabIdx", vm.ohsConf.getConf().defTabIdx);
            } else {
                vm.ohsConf.setConf("knobReadOnly", vm.ohsConf.getConf().statusLocked);
            }
            // Change readOnly property for knobs
            var items = vm.ohsItemsList.getItems();
            Object.keys(items).forEach(function (itemKey) {
                var item = items[itemKey];
                vm.ohsKnobs.setKnobs(item.readItem, "readOnly", vm.ohsConf.getConf().knobReadOnly);
            });
        }
        vm.ohsConf.setConf("runningMode", mode);
        if (vm.ohsConf.getConf().modeItem != "") {
            vm.OHService.sendCmd(vm.ohsConf.getConf().modeItem, mode.toString());
        }
        // Unsuspend Knob watch
        vm.$timeout(function () {
            vm.ohsConf.setConf("knobWatchOn", true);
        }, 100);
    }

    // Update knob properties (for each member/item)
    OHSchedMainCtl.prototype._updateKnobValue = function _updateKnobValue(readItem, setItem) {
        var vm = this;
        // Suspend Knob watch
        vm.ohsConf.setConf("knobWatchOn", false);
        vm.ohsKnobs.setKnobs(readItem, "value", vm._itemState(readItem, false));
        vm.ohsKnobs.setKnobs(readItem, "subText", vm._itemState(setItem, false));
        vm.ohsKnobs.setKnobs(readItem, "readOnly", vm.ohsConf.getConf().knobReadOnly);
        // Unsuspend Knob watch
        vm.$timeout(function () {
            vm.ohsConf.setConf("knobWatchOn", true);
        }, 100);
    }

    // Update items on change/click
    OHSchedMainCtl.prototype._selectItem = function _selectItem(item) {
        var vm = this;
        vm.ohsItemsList.selectItem(item, vm.ohsConf.getConf().multiSel);
        if (checkedCount(vm.ohsItemsList.getItems()) == 1 && vm.ohsConf.getConf().tabIdx == 1) {
            vm.ohsConf.setConf("selItem", item.setItem);
            vm.ohsConf.setConf("selItemLabel", item.label);
        }
        if (vm.ohsConf.getConf().tabIdx == 1) {
            // Schedule tab -> index = 1
            vm._refreshSchedule();
        }
    }

    // Update days on change/click
    OHSchedMainCtl.prototype._selectDay = function _selectDay(day) {
        var vm = this;
        vm.ohsDays.setDays(day, vm.ohsConf.getConf().multiSel);
    }

    // Update duration
    OHSchedMainCtl.prototype._updateDuration = function _updateDuration(value) {
        var vm = this;
        vm.ohsTime.setDuration(value);
    }

    // Change Tab
    OHSchedMainCtl.prototype._changeTab = function _changeTab(idx) {
        var vm = this;
        vm.ohsConf.setConf("tabIdx", idx);
        switch (idx) {
        case 2: // AddEdit
            if (vm.ohsConf.getConf().selTime != "") {
                vm.ohsConf.setConf("edit", true);
                vm.ohsConf.setConf("multiSel", false);
            } else {
                vm.ohsConf.setConf("edit", false);
                vm.ohsConf.setConf("multiSel", true);
                // Select 1st item
                vm.ohsItemsList.selectFirstItem();
                vm.ohsConf.setConf("selItem", vm.ohsItemsList.getFirstItem().setItem);
                vm.ohsConf.setConf("selItemLabel", vm.ohsItemsList.getFirstItem().label);
                // Select current day and hour
                vm.ohsDays.selectToday();
                vm.ohsTime.setTimeProp("time");
                if (vm.ohsConf.getConf().type == "Thermostat") {
                    vm.ohsKnobs.setKnobs("setTemp", "value", vm.ohsTemp.getTemp().set);
                } else {
                    vm.ohsTime.setDuration(60);
                }
            }
            break;
        case 1: // Schedule
            vm.ohsConf.setConf("edit", false);
            vm.ohsConf.setConf("multiSel", false);
            vm.ohsConf.setConf("selDay", "");
            vm.ohsConf.setConf("selTime", "");
            // Only one item should be selected
            if (checkedCount(vm.ohsItemsList.getItems()) != 1) {
                // Select 1st item
                vm.ohsItemsList.selectFirstItem();
                vm.ohsConf.setConf("selItem", vm.ohsItemsList.getFirstItem().setItem);
                vm.ohsConf.setConf("selItemLabel", vm.ohsItemsList.getFirstItem().label);
            }
            vm._refreshSchedule();
            break;
        default:
            vm.ohsConf.setConf("edit", false);
            vm.ohsConf.setConf("multiSel", true);
            vm.ohsConf.setConf("selDay", "");
            vm.ohsConf.setConf("selTime", "");
        };
    }

    // Refresh Schedule: load current
    OHSchedMainCtl.prototype._refreshSchedule = function _refreshSchedule() {
        var vm = this;
        var schedule = vm.itemState(vm.ohsConf.getConf().storeItem);
        if (schedule != "N/A" && schedule != "" && schedule != "NULL") {
            vm.ohsSchedule.initSchedule(schedule);
            if (vm.ohsConf.getConf().type == "Thermostat") {
                vm.ohsTimeline.initTimeline(vm.ohsDays.getDays(), vm.ohsSchedule.getSchedule(vm.ohsConf.getConf().selItem), vm.ohsTemp.getTemp().unit);
            } else {
                vm.ohsTimeline.initTimeline(vm.ohsDays.getDays(), vm.ohsSchedule.getSchedule(vm.ohsConf.getConf().selItem));
            }
        }
        vm.$rootScope.$emit("ohscheduler-update", "timeline");
    }

    // Edit Item Schedule
    OHSchedMainCtl.prototype._editSchedule = function _editSchedule(selDay, selTime, selVal) {
        var vm = this;
        vm.ohsConf.setConf("tabIdx", 2); // AddEdit
        vm.ohsConf.setConf("multiSel", false);
        vm.ohsConf.setConf("edit", true);
        vm.ohsConf.setConf("selDay", selDay);
        vm.ohsConf.setConf("selTime", selTime);
        if (vm.ohsConf.getConf().type == "Thermostat") {
            vm.ohsTemp.setTempProp("temp", selVal);
            vm.ohsKnobs.setKnobs("setTemp", "value", selVal);
        } else {
            vm.ohsTime.setTimeProp("duration", selVal);
        }
        vm.ohsDays.setDays({
            setItem: selDay,
            checked: true
        }, false);
        vm.ohsTime.setTimeProp("time", selTime);
        var items = vm.ohsItemsList.getItems();
        Object.keys(items).forEach(function (itemKey) {
            var item = items[itemKey];
            if (item.checked) {
                vm.ohsConf.setConf("selItem", item.setItem);
                vm.ohsConf.setConf("selItemLabel", item.label);
            }
        });
    }

    // Remove missing items from schedule
    OHSchedMainCtl.prototype._cleanupSchedule = function _cleanupSchedule() {
        var vm = this;
        var schedule = vm.ohsSchedule.getSchedule();
        Object.keys(schedule).forEach(function (schedKey) {
            var itemFound = false;
            var items = vm.ohsItemsList.getItems();
            Object.keys(items).forEach(function (itemKey) {
                var item = items[itemKey];
                if (item.setItem == schedKey) {
                    itemFound = true;
                }
            });
            if (!itemFound) {
                vm.ohsSchedule.deleteSchedule(schedKey);
            }
        });
    };

    // Delete from JSON schedule
    OHSchedMainCtl.prototype._deleteSchedule = function _deleteSchedule() {
        var vm = this;
        // Load schedule to ensure that we have the last version
        vm._refreshSchedule();
        if (vm.ohsConf.getConf().edit && typeof vm.ohsSchedule.getSchedule() == "object") {
            vm.ohsSchedule.deleteSchedule(vm.ohsConf.getConf().selItem, vm.ohsConf.getConf().selDay, vm.ohsConf.getConf().selTime);
        }
        vm.ohsConf.setConf("multiSel", true);
        vm.ohsConf.setConf("edit", false);
        vm.ohsConf.setConf("tabIdx", vm.ohsConf.getConf().defTabIdx);
        vm._cleanupSchedule();
        vm.OHService.sendCmd(vm.ohsConf.getConf().storeItem, JSON.stringify(vm.ohsSchedule.getSchedule()));
    };

    // Add Or Update schedule JSON
    OHSchedMainCtl.prototype._addOrUpdateSchedule = function _addOrUpdateSchedule() {
        var vm = this;
        var strTime = "";
        var items = vm.ohsItemsList.getItems();
        // Load schedule to ensure that we have the last version
        vm._refreshSchedule();
        strTime = strTime.concat("T", zeroPad(vm.ohsTime.getTime().time.getHours()), zeroPad(vm.ohsTime.getTime().time.getMinutes()));
        // Add or Update values for selected item(s) and day(s)
        Object.keys(items).forEach(function (itemKey) {
            var item = items[itemKey];
            if (item.checked) {
                var days = vm.ohsDays.getDays();
                Object.keys(days).forEach(function (dayKey) {
                    var day = days[dayKey];
                    if (day.checked) {
                        // Add or Update schedule item
                        if (vm.ohsConf.getConf().type == "Thermostat") {
                            vm.ohsSchedule.addUpdateSchedule(item.setItem, day.setItem, strTime, vm.ohsKnobs.getKnobs().setTemp.value);
                        } else {
                            vm.ohsSchedule.addUpdateSchedule(item.setItem, day.setItem, strTime, vm.ohsTime.getTime().duration);
                        }
                        if (vm.ohsConf.getConf().edit) {
                            if (item.setItem != vm.ohsConf.getConf().selItem || day.setItem != vm.ohsConf.getConf().selDay || strTime != vm.ohsConf.getConf().selTime) {
                                // Delete the previous schedule if any of the following changed: item, day, time
                                vm.ohsSchedule.deleteSchedule(vm.ohsConf.getConf().selItem, vm.ohsConf.getConf().selDay, vm.ohsConf.getConf().selTime);
                            }
                        }
                    }
                });
            }
        });

        // Change to Status/Schedule tab
        vm.ohsConf.setConf("multiSel", true);
        vm.ohsConf.setConf("edit", false);
        vm.ohsConf.setConf("tabIdx", vm.ohsConf.getConf().defTabIdx);
        vm._cleanupSchedule();
        vm.OHService.sendCmd(vm.ohsConf.getConf().storeItem, JSON.stringify(vm.ohsSchedule.getSchedule()));
    }

    // Timeline move window left/right
    OHSchedMainCtl.prototype._stepWindow = function _stepWindow(dirVal) {
        var vm = this;
        var timeline = vm.ohsTimelineTools.object;
        var percentage = (dirVal > 0) ? 0.25 : -0.25;
        var range = timeline.getWindow();
        var interval = range.end - range.start;
        if (timeline === undefined) {
            return;
        }
        timeline.setWindow({
            start: range.start.valueOf() - interval * percentage,
            end: range.end.valueOf() - interval * percentage
        });
    }

    // Timeline zoom in/out
    OHSchedMainCtl.prototype._zoomWindow = function _zoomWindow(zoomVal) {
        var vm = this;
        var timeline = vm.ohsTimelineTools.object;
        var percentage = (zoomVal < 0) ? 0.25 : -0.25;
        var range = timeline.getWindow();
        var interval = range.end - range.start;
        if (timeline === undefined) {
            return;
        }
        timeline.setWindow({
            start: range.start.valueOf() - interval * percentage,
            end: range.end.valueOf() + interval * percentage
        });
    }

    // Watch timeline events
    OHSchedMainCtl.prototype._getTimelineEvents = function _getTimelineEvents() {
        var vm = this;
        var timelineTimeout = null;
        var timelineEvents = {
            click: function click(clicked) {
                //simulate doubleClick - workaround for mobile
                if (clicked.what === "item") {
                    vm.$timeout.cancel(timelineTimeout);
                    if (vm.ohsTimelineTools.item == clicked.item && vm.ohsTimelineTools.group == clicked.group && vm.ohsTimelineTools.item !== "") {
                        var schedule = vm.ohsTimeline.getTimeline(clicked.item, clicked.group);
                        vm._editSchedule(schedule.day, schedule.time, schedule.value);
                    } else {
                        vm.ohsTimelineTools.item = clicked.item;
                        vm.ohsTimelineTools.group = clicked.group;
                    }
                    timelineTimeout = vm.$timeout(function () {
                        vm.ohsTimelineTools.item = "";
                        vm.ohsTimelineTools.group = "";
                    }, 2000);
                }
            },
            doubleClick: function doubleClick(clicked) {
                if (clicked.what === "item") {
                    vm.$timeout.cancel(timelineTimeout);
                    vm.ohsTimelineTools.item = "";
                    vm.ohsTimelineTools.group = "";
                    var schedule = vm.ohsTimeline.getTimeline(clicked.item, clicked.group);
                    vm._editSchedule(schedule.day, schedule.time, schedule.value);
                }
            },
            onload: function onload(timeline) {
                vm.ohsTimelineTools.object = timeline;
            }
        };
        return timelineEvents;
    }

    // Function to refresh the model on SSE changes
    OHSchedMainCtl.prototype._ohsRefresh = function _ohsRefresh(eventItem) {
        var vm = this;
        // Validate if the changed item is used by this widget
        if (vm.ohsConf.getConf().modeItem === eventItem && !vm.ohsConf.getConf().runningModeHidden) {
            // Running mode item
            vm._changeMode(vm._itemState(eventItem, false));
        } else if (vm.ohsConf.getConf().storeItem === eventItem) {
            // Schedule store item
            vm._refreshSchedule();
        } else if (vm.ohsConf.getConf().type == "Thermostat" && vm.ohsConf.getConf().defTabIdx == 0 && !vm.ohsConf.getConf().statusHidden) {
            // Only if the Status tab is enabled
            var item = null;
            // Suspend Knob watch
            vm.ohsConf.setConf("knobWatchOn", false);
            try {
                item = vm.$filter("filter")(vm.ohsItemsList.getItems(), {
                    setItem: eventItem
                }, true)[0];
                vm.ohsKnobs.setKnobs(item.readItem, "value", vm._itemState(item.readItem, false));
                vm.ohsKnobs.setKnobs(item.readItem, "subText", vm._itemState(item.setItem, false));
            } catch (e) {
                item = null;
            }
            if (!item) {
                try {
                    item = vm.$filter("filter")(vm.ohsItemsList.getItems(), {
                        readItem: eventItem
                    }, true)[0];
                    vm.ohsKnobs.setKnobs(item.readItem, "value", vm._itemState(item.readItem, false));
                } catch (e) {
                    item = null;
                }
            }
            // Unsuspend Knob watch
            vm.$timeout(function () {
                vm.ohsConf.setConf("knobWatchOn", true);
            }, 100);
        }
    }

})();