var Promise = require('promise');

module.exports = function(RED) {

    function SmartthingsOnOffNode(config) {
        RED.nodes.createNode(this, config);

        console.debug("SmartthingsOnOffNode")
        console.debug(config);

        this.conf = RED.nodes.getNode(config.conf);
        this.name = config.name;
        this.device = config.device;

        this.currentStatus = 0;

        this.reportStatus = function(original) {
            let msg = {
                topic: "device",
                payload: {
                    deviceId: this.device,
                    deviceType: "switch",
                    name: this.name,
                    value: this.currentStatus
                }
            };

            if(original !== undefined){
              original.payload = msg.payload;
              Object.assign(msg,original);
            }

            this.send(msg);
        }

        this.updateStatus = function(currentStatus){
            this.currentStatus = currentStatus;
            this.reportStatus();
        }

        if(this.conf && this.device){
            const callback  = (evt) => {
                console.debug("OnOffDevice("+this.name+") Callback called");
                console.debug(evt);
                if(evt["name"] == "switch"){
                    this.updateStatus((evt["value"].toLowerCase() === "on" ? 1 : 0));
                }
            }

            this.conf.registerCallback(this, this.device, callback);

            this.conf.getDeviceStatus(this.device,"main/capabilities/switch").then( (status) => {
                console.debug("OnOffDevice("+this.name+") Status Refreshed");

                current = status["switch"]["value"];
                if(current){
                    this.updateStatus((current.toLowerCase() == "on" ? 1 : 0));
                }
            }).catch( err => {
                console.error("Ops... error getting device state (OnOffDevice)");
                console.error(err);
            });

            this.on('input', msg => {
                console.debug("Input Message Received");
                if(msg && msg.payload && !isNaN(msg.payload.value) && msg.topic === "switch"){
                    this.conf.executeDeviceCommand(this.device,[{
                        component: "main",
                        capability: "switch",
                        command: (msg.payload.value == 1 ? "on" : "off")
                    }]).then( (ret) => {
                        this.updateStatus(msg.payload.value);
                    }).catch( (ret) => {
                        console.error("Error updating device");
                    });
                } else if(msg.topic === "update"){
                    this.reportStatus(msg);
                }
            });

            this.on('close', () => {
                console.debug("Closed");
                this.conf.unregisterCallback(this, this.device, callback);
            });
        }
    }

    RED.nodes.registerType("smartthings-node-onoff", SmartthingsOnOffNode);

};
