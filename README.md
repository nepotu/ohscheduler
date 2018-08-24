### OHScheduler a HABPanel widget

### About
OHScheduler is a HABPanel widget that simulates a scheduling interface for Virtual Thermostats and On/Off appliances.

The schedule is stored in a JSON object. This is passed to an openHAB item, which will be parsed by the openHAB custom rule provided with this widget.

The JSON structure:

> `{"Target_Item_1": {"D1": {"T0500": 24,"T0800": 20},"D2": {...},..."D7": {...}},"Target_Item_2": {"D1": {...},...}}`

* `Target_Item_1` - the item which will receive the target temperature/the item that will be switched On/Off
* `D1-D7` - week days (Monday to Sunday)
* `Thhmm` - time of the day
* `value` - target temperature/On duration


**Requirements:**
* openHAB 2.2 (should work with all 2.2+ releases)
* Eclipse SmartHome Transformation Service (JsonPath)

**Widget customizable parameters:**
* Scheduler Type: Thermostat or On/Off Appliance
* Temperature min, max, step, unit and default target temperature
* Time step (hour and minute)
* openHAB Item that stores the schedule
* openHAB Item that contains the operating mode (manual, automatic …)
* Customized running modes list (an array of values should be passed); if not (correctly) defined, then the built-in modes will be used:
  * Thermostat: ["OFF", "MANUAL", "AUTO", "COOL", "HEAT"]
  * OnOff: ["MANUAL", "SCHEDULE"]
* Disable target temperature change from the Status view/tab (will not apply if operating mode is MANUAL).
* Options to hide the Status tab and the Running Mode selector (show only the scheduling tabs)

There is only one parameter that needs more attention: the **Items** parameter. This parameter contains an array of objects defined as follows:

> `[{"setItem": "TargetItem", "label": "Item Label", "readItem": "ReadItem"}, {…}]`

Items object properties:
* `setItem`: this is the item that will be changed on execution (e.g. the item that stores the target temperature or the appliance switch state)
* `label`: the object/item label that will be displayed on the widget
* `readItem`: used only for virtual thermostat; current temperature item


**Few words regarding the openHAB rules:**
* The rule that parses the JSON containing the schedule is executed using a cron set to fire each minute. Additionally the rule will be fired if the item that stores the JSON is updated or if the operating mode item changes.
* To avoid unnecessary CPU cycles the schedule processing will be put to sleep using timers. Here is a small difference between the thermostat (HVAC) rules and the OnOff ones.
* Changes are sent on a "queue" item (HVAC_Queue / OnOff_Queue)

For HVAC: the code parses the JSON schedule and sets the current target temperature, if none set. Then it determines the next change in schedule. If multiple items share the same day-time pair then those are added in the queue item, along with the new target temperature and then it sleeps until next change should occur. Once the timer expires the new values are set and the queue is populated with the next change.

OnOff: is built on the same model. The difference is the OnOff schedule model contains only the time when the switch item should be turned ON and the ON duration. The queue is used again, but this time it will trigger the OFF state.


**Widget resources:**

[Sample Items](./items/), should be stored in **`<openhab_config>/items/`**:
* [OHScheduler.items](./items/OHScheduler.items) - sample items for both virtual thermostat and off appliances (it contains also the array of objects that should be used in the widget configuration with those items)

_Put your binding config for the temperature items on the the lines 11,13 and 15, which end with `{}`. If no such binding available, and you want to set the item value manually (e.g. from rules for testing purposes) then you should remove those curly braces._

[Rules](./rules/), should be stored in **`<openhab_config>/rules/`**:
* [OHSchedulerHVAC.rules](./rules/OHSchedulerHVAC.rules) - rules file for virtual thermostat
* [OHSchedulerOnOff.rules](./rules/OHSchedulerOnOff.rules) - rules file for OnOff appliances

[Widget JSON](./widget/) to be imported in HABPanel:
* [OHScheduler.widget.json](./widget/OHScheduler.widget.json) - the widget that should be imported in HABPanel

[Widget resources](./html/habpanel/scheduler) (js, css, svg and html) should be stored in **`<openhab_config>/html/habpanel/scheduler/`**:
* [ohscheduler.js](./html/habpanel/scheduler/ohscheduler.js) - the JavaScript that does the heavy lifting
* [ohscheduler.tpl.html](./html/habpanel/scheduler/ohscheduler.tpl.html) - the widget html template used by the widgetScheduler directive
* [ohscheduler.css](./html/habpanel/scheduler/ohscheduler.css) , [ohscheduler.svg](./html/habpanel/scheduler/) - resources used by the widget
* [vis.min.js](./html/habpanel/scheduler/vis.min.js) - [VisJS visualization library](http://visjs.org/)
* [angular-vis.js](./html/habpanel/scheduler/angular-vis.js) - [AngularJS directive module for VisJS components](https://github.com/visjs/angular-visjs)


**Widget interface:**

* [Widget Settings](./images/OHScheduler-widgetSettings.png)
* [Thermostat Status](./images/OHS-Thermostat-Status.png)
* [Thermostat Status small screen](./images/OHS-Thermostat-Status-small.png)
* [Thermostat View Schedule](./images/OHS-Thermostat-Schedule.png)
* [Thermostat Add/Edit](./images/OHS-Thermostat-AddEdit.png)
* [OnOff Status](./images/OHS-OnOff.png)
* [OnOff Add/Edit](./images/OHS-OnOff-AddEdit.png)