var Promise = require('promise');

module.exports = function(RED) {

    function SmartthingsWaterNode(config) {
        RED.nodes.createNode(this, config);

        console.debug("SmartthingsWaterNode")
        console.debug(config);

        this.conf = RED.nodes.getNode(config.conf);
        this.name = config.name;
        this.device = config.device;

        this.state = {
            value: 0
        };

        this.reportState = function(original) {
            let msg = {
                topic: "device",
                payload: {
                    deviceId: this.device,
                    deviceType: "water",
                    name: this.name,
                    value: this.state.value,
                }
            };

            if(original !== undefined){
              original.payload = msg.payload;
              Object.assign(msg,original);
            }

            this.send(msg);
        }

        this.setState = function(value){
            Object.assign(this.state, value);
            this.reportState();
        };

        if(this.conf && this.device){
            const callback  = (evt) => {
                console.debug("WaterDevice("+this.name+") Callback called");
                console.debug(evt);
                if(evt["name"] == "water"){
                    this.setState({
                        value: evt["value"]
                    });
                }
            }

            this.conf.registerCallback(this, this.device, callback);

            this.conf.getDeviceStatus(this.device,"main/capabilities/waterSensor").then( (status) => {
                console.debug("WaterDevice("+this.name+") Status Refreshed");
                console.debug(status);

                this.setState({
                    value: status["water"]["value"],
                });

            }).catch( err => {
                console.error("Ops... error getting device state (WaterDevice)");
                console.error(err);
            });

            this.on('input', msg => {
                console.debug("Input Message Received");
                console.log(msg);

                if(msg && msg.topic !== undefined){
                    switch(msg.topic){
                        case "update":
                            this.reportState(msg);
                            break;
                    }
                }
            });

            this.on('close', () => {
                console.debug("Closed");
                this.conf.unregisterCallback(this, this.device, callback);
            });
        }
    }

    RED.nodes.registerType("smartthings-node-water", SmartthingsWaterNode);
};
