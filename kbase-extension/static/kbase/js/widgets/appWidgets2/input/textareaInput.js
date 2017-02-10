define([
    'bluebird',
    'kb_common/html',
    '../validators/text',
    'common/events',
    'common/ui',
    'common/props',
    'common/runtime',
    '../inputUtils',
    'bootstrap',
    'css!font-awesome'
], function(
    Promise,
    html,
    Validation,
    Events,
    UI,
    Props,
    Runtime,
    inputUtils) {
    'use strict';

    // Constants
    var t = html.tag,
        div = t('div'),
        textarea = t('textarea');

    function factory(config) {
        var spec = config.parameterSpec,
            parent, container,
            runtime = Runtime.make(),
            // bus = config.bus,
            busConnection = runtime.bus().connect(),
            channel = busConnection.channel(config.channelName),
            model = {
                value: undefined
            },
            ui,
            options = {
                enabled: true,
                rowCount: spec.ui.nRows || 5
            };

        // CONTROL

        function getControlValue() {
            return ui.getElement('input-container.input').value;
        }

        function setControlValue(newValue) {
            if (newValue === null) {
                newValue = '';
            }
            ui.getElement('input-container.input').value = newValue;
        }

        // MODEL

        // NB this is a trusted method. The value had better be valid,
        // since it won't (can't) be validated. Validation is an event 
        // which sits between the control and the model.
        function setModelValue(value) {
            if (value === undefined) {
                return;
            }
            if (model.getItem('value') === value) {
                return;
            }
            model.setItem('value', value);
        }

        function resetModelValue() {
            setModelValue(spec.data.constraints.defaultValue);
        }

        // sync the dom to the model.
        function syncModelToControl() {
            setControlValue(model.getItem('value', null));
        }


        // VALIDATION

        function importControlValue() {
            return Promise.try(function() {
                return Validation.importString(getControlValue());
            });
        }

        function validate(value) {
            return Promise.try(function() {
                return Validation.validate(value, spec);
            });
        }

        function autoValidate() {
            return validate(model.getItem('value'))
                .then(function(result) {
                    channel.emit('validation', result);
                });
        }

        var autoChangeTimer;

        function cancelTouched() {
            if (autoChangeTimer) {
                window.clearTimeout(autoChangeTimer);
                autoChangeTimer = null;
            }
        }

        function handleTouched(interval) {
            var editPauseInterval = interval || 100;
            return {
                type: 'keyup',
                handler: function(e) {
                    channel.emit('touched');
                    cancelTouched();
                    autoChangeTimer = window.setTimeout(function() {
                        autoChangeTimer = null;
                        e.target.dispatchEvent(new Event('change'));
                    }, editPauseInterval);
                }
            };
        }

        function handleChanged() {
            return {
                type: 'change',
                handler: function() {
                    cancelTouched();
                    importControlValue()
                        .then(function(value) {
                            model.setItem('value', value);
                            channel.emit('changed', {
                                newValue: value
                            });
                            return validate(value);
                        })
                        .then(function(result) {
                            if (result.isValid) {
                                if (config.showOwnMessages) {
                                    ui.setContent('input-container.message', '');
                                }
                            } else if (result.diagnosis === 'required-missing') {
                                // nothing??
                            } else {
                                if (config.showOwnMessages) {
                                    // show error message -- new!
                                    var message = inputUtils.buildMessageAlert({
                                        title: 'ERROR',
                                        type: 'danger',
                                        id: result.messageId,
                                        message: result.errorMessage
                                    });
                                    ui.setContent('input-container.message', message.content);
                                    message.events.attachEvents();
                                }
                            }
                            channel.emit('validation', result);
                        })
                        .catch(function(err) {
                            channel.emit('validation', {
                                isValid: false,
                                diagnosis: 'invalid',
                                errorMessage: err.message
                            });
                        });
                }
            };
        }

        /*
         * Creates the markup
         * Places it into the dom node
         * Hooks up event listeners
         */
        function makeInputControl(events) {
            return textarea({
                id: events.addEvents({
                    events: [handleChanged(), handleTouched()]
                }),
                class: 'form-control',
                dataElement: 'input',
                rows: options.rowCount
            });
        }

        function render(events) {
            var content = div({
                dataElement: 'main-panel'
            }, [
                div({ dataElement: 'input-container' }, [
                    makeInputControl(events)
                ])
            ]);
            return {
                content: content,
                events: events
            };
        }

        // LIFECYCLE API
        function start(arg) {
            return Promise.try(function() {
                parent = arg.node;
                container = parent.appendChild(document.createElement('div'));
                ui = UI.make({ node: container });

                var events = Events.make(),
                    theLayout = render(events);

                setModelValue(config.initialValue);

                container.innerHTML = theLayout.content;
                events.attachEvents(container);

                channel.on('reset-to-defaults', function() {
                    resetModelValue();
                });
                channel.on('update', function(message) {
                    setModelValue(message.value);
                });
                // bus.emit('sync');
                syncModelToControl();
                autoValidate();
            });
        }

        function stop() {
            return Promise.try(function() {
                busConnection.stop();
                if (parent && container) {
                    parent.removeChild(container);
                }
            });
        }

        // INIT

        model = Props.make({
            data: {
                value: null
            },
            onUpdate: function() {}
        });

        setModelValue(config.initialValue);

        return {
            start: start,
            stop: stop
        };
    }

    return {
        make: function(config) {
            return factory(config);
        }
    };
});