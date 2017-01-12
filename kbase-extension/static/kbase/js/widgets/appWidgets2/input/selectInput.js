/*global define*/
/*jslint white:true,browser:true*/
define([
    'bluebird',
    'kb_common/html',
    'common/events',
    'common/ui',
    'common/runtime',
    '../validators/text',
    '../inputUtils',

    'bootstrap',
    'css!font-awesome'
], function (
    Promise,
    html,
    Events,
    UI,
    Runtime,
    Validation,
    inputUtils) {
    'use strict';

    // Constants
    var t = html.tag,
        div = t('div'),
        select = t('select'),
        option = t('option');

    function factory(config) {
        var spec = config.parameterSpec,
            runtime = Runtime.make(),
            busConnection = runtime.bus().connect(),
            channel = busConnection.channel(config.channelName),
            parent,
            ui,
            container,
            model = {
                availableValues: null,
                value: null
            };

        model.availableValues = spec.data.constraints.options;

        model.availableValuesMap = {};
        model.availableValues.forEach(function (item, index) {
            item.index = index;
            model.availableValuesMap[item.value] = item;
        });

        function getControlValue() {
            var control = ui.getElement('input-container.input'),
                selected = control.selectedOptions;

            if (selected.length === 0) {
                return spec.data.nullValue;
            }

            // we are modeling a single string value, so we always just get the 
            // first selected element, which is all there should be!
            return selected.item(0).value;
        }

        /*
            Set the control value:
            - if falsy, empty the selections
            - if string, select that single item
            - if array, select each item in the array
        */
        function setControlValue(value) {
            var selections = [];
            if (value) {
                switch (typeof value) {
                    case 'string':
                        selections.push(value);
                        break;
                    case 'object':
                        if (value instanceof Array) {
                            selections = value;
                        } else {
                            return;
                        }
                        break;
                    default:
                        return;
                }
            }

              // assuming the model has been modified...
            var control = ui.getElement('input-control.input');
            // loop through the options, selecting the one with the value.
            // unselect

            var option;
            for (var i = 0; i < control.length; i += 1) {
                option = control.options.item(i);
                if (selections.indexOf(option.value) >= 0) {
                    option.selected = true;
                } else {
                    option.selected = false;
                }
            }
        }

        // VALIDATION

        function importControlValue() {
            return Promise.try(function () {
                return Validation.importString(getControlValue());
            });
        }

        function validate(value) {
            return Promise.try(function () {
                return Validation.validate(value, spec);
            });
        }

        function autoValidate() {
            return validate(model.value)
                .then(function (result) {
                    channel.emit('validation', result);
                });
        }

        function autoChange(value) {
            setControlValue(value);
            doChanged();
        }

        // DOM EVENTS

        function doChanged() {
            importControlValue()
                .then(function (value) {
                    model.value = value;
                    channel.emit('changed', {
                        newValue: value
                    });
                    return validate(value);
                })
                .then(function (result) {
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
                .catch(function (err) {
                    channel.emit('validation', {
                        isValid: false,
                        diagnosis: 'invalid',
                        errorMessage: err.message
                    });
                });
        }

        function handleChanged() {
            return {
                type: 'change',
                handler: function () {
                    doChanged();
                }
            };
        }

        function makeInputControl(events) {
            var selected,
                selectOptions = model.availableValues.map(function (item) {
                    selected = false;
                    if (item.value === model.value) {
                        selected = true;
                    }

                    return option({
                        value: item.value,
                        selected: selected
                    }, item.display);
                });

            // CONTROL
            return select({
                id: events.addEvents({ events: [handleChanged()] }),
                class: 'form-control',
                dataElement: 'input'
            }, [option({ value: '' }, '')].concat(selectOptions));
        }

        function syncModelToControl() {
            // assuming the model has been modified...
            var control = ui.getElement('input-control.input');
            // loop through the options, selecting the one with the value.
            // unselect
            if (control.selectedIndex >= 0) {
                control.options.item(control.selectedIndex).selected = false;
            }
            var selectedItem = model.availableValuesMap[model.value];
            if (selectedItem) {
                control.options.item(selectedItem.index + 1).selected = true;
            }
        }

        function layout(events) {
            var content = div({
                dataElement: 'main-panel'
            }, [
                div({ dataElement: 'input-container' },
                    makeInputControl(events)
                )
            ]);
            return {
                content: content,
                events: events
            };
        }

        function setModelValue(value) {
            if (model.value !== value) {
                model.value = value;
            }
        }

        function resetModelValue() {
            setModelValue(spec.data.defaultValue);
        }


        // LIFECYCLE API

        function start(arg) {
            return Promise.try(function () {
                parent = arg.node;
                container = parent.appendChild(document.createElement('div'));
                ui = UI.make({ node: container });

                var events = Events.make({ node: container }),
                    theLayout = layout(events);

                container.innerHTML = theLayout.content;
                events.attachEvents();

                channel.on('reset-to-defaults', function () {
                    resetModelValue();
                });
                channel.on('update', function (message) {
                    setModelValue(message.value);
                });
                // bus.emit('sync');

                autoChange(config.initialValue);
            });
        }

        function stop() {
            return Promise.try(function () {
                if (container) {
                    parent.removeChild(container);
                }
                busConnection.stop();
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