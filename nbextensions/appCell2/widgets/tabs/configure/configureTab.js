define([
    'bluebird',
    './appParamsWidget',
    'common/runtime'
], function (
    Promise,
    AppParamsWidget,
    Runtime
) {
    'use strict';

    

    function factory(config) {
        var container,
            widget,
            model = config.model,
            parentBus = config.bus,
            fsm = config.fsm,
            parameters = config.parameters,
            workspaceInfo = config.workspaceInfo;


        function loadParamsWidget(arg) {
            // TODO: widget should make own bus.
            var runtime = Runtime.make(),
                conn = runtime.bus().connect(),
                bus = conn.channel(null),
                widget = AppParamsWidget.make({
                    bus: bus,
                    workspaceInfo: workspaceInfo,
                    initialParams: model.getItem('params')
                });

            console.log('loading parms widget...', bus, bus.channelName);

            bus.on('sync-params', function (message) {
                message.parameters.forEach(function (paramId) {
                    bus.send({
                        parameter: paramId,
                        value: model.getItem(['params', message.parameter])
                    }, {
                        key: {
                            type: 'update',
                            parameter: message.parameter
                        }
                    });
                });
            });

            bus.on('parameter-sync', function (message) {
                var value = model.getItem(['params', message.parameter]);
                bus.send({
                    //                            parameter: message.parameter,
                    value: value
                }, {
                    // This points the update back to a listener on this key
                    key: {
                        type: 'update',
                        parameter: message.parameter
                    }
                });
            });

            bus.on('set-param-state', function (message) {
                model.setItem('paramState', message.id, message.state);
            });

            bus.respond({
                key: {
                    type: 'get-param-state'
                },
                handle: function (message) {
                    return {
                        state: model.getItem('paramState', message.id)
                    };
                }
            });

            bus.respond({
                key: {
                    type: 'get-parameter'
                },
                handle: function (message) {
                    return {
                        value: model.getItem(['params', message.parameterName])
                    };
                }
            });

            bus.on('parameter-changed', function (message) {
                // TODO: should never get these in the following states....
                console.log('parameter changed?', message); 

                var state = fsm.getCurrentState().state;
                if (state.mode === 'editing') {
                    model.setItem(['params', message.parameter], message.newValue);
                    parentBus.emit('app-state-changed');
                    // evaluateAppState();
                } else {
                    console.warn('parameter-changed event detected when not in editing mode - ignored');
                }
            });

            return widget.start({
                node: arg.node,
                appSpec: model.getItem('app.spec'),
                parameters: parameters
            })
            .then(function () {
                return {
                    bus: bus,
                    instance: widget
                };
            });
        }            

        function start(arg) {
            container = config.node;
            return loadParamsWidget({
                node: container
            })
            .then(function (result) {
                widget = result;
            });
        }

        function stop() {
            return Promise.try(function () {
                if (widget) {
                    widget.bus.stop();
                    return widget.instance.stop();
                }
            });
        }

        return {
            start: start,
            stop: stop
        };
    }

    return {
        make: function (config) {
            return factory(config);
        }
    };
});