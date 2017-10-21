/*global define*/
/*jslint white:true,browser:true*/
define([
    'bluebird',
    'jquery',
    'kb_common/html',
    'kb_common/utils',
    'api/fileStaging',
    'kb_service/utils',
    'common/validation',
    'common/events',
    'common/runtime',
    'common/ui',
    'common/data',
    'util/timeFormat',
    'util/string',
    'select2',
    'bootstrap',
    'css!font-awesome'
], function(
    Promise,
    $,
    html,
    utils,
    FileStaging,
    serviceUtils,
    Validation,
    Events,
    Runtime,
    UI,
    Data,
    TimeFormat,
    StringUtil) {
    'use strict';

    // Constants
    var t = html.tag,
        div = t('div'),
        span = t('span'),
        b = t('b'),
        select = t('select'),
        option = t('option');

    function factory(config) {
        var spec = config.parameterSpec,
            parent,
            container,
            runtime = Runtime.make(),
            bus = runtime.bus().connect(),
            channel = bus.channel(config.channelName),
            ui,
            dataSource = 'ftp_staging', // only option now, should come from the parameterSpec.
            model = {
                value: undefined
            },
            fileStaging = new FileStaging(runtime.config('services.ftp_api_url.url'),
                runtime.userId(), {token: runtime.authToken()}),
            eventListeners = [];

        function makeInputControl() {
            var selectOptions;
            var selectElem = select({
                class: 'form-control',
                dataElement: 'input',
                style: {
                    width: '100%'
                },
                id: html.genId()
            }, [option({ value: '' }, '')].concat(selectOptions));

            return selectElem;
        }

        // CONTROL
        function getControlValue() {
            var control = ui.getElement('input-container.input'),
                selected = control.selectedOptions;
            if (selected.length === 0) {
                return;
            }
            // we are modeling a single string value, so we always just get the
            // first selected element, which is all there should be!
            return selected.item(0).value;
        }

        /**
         * Sets the dropdown value to the given value. Constructs an id from it that (should)
         * be unique enough to apply to the dropdown.
         */
        function setControlValue(value) {
            var control = ui.getElement('input-container.input');
            if ($(control).find('option[value="' + value + '"]').length) {
                $(control).val(value).trigger('change');
            } else {
                var newOption = new Option(value, value, true, true);
                $(control).append(newOption).trigger('change');
            }
        }

        // MODEL

        function setModelValue(value) {
            if (model.value === undefined) {
                return;
            }
            if (model.value !== value) {
                model.value = value;
            }
        }

        function resetModelValue() {
            setModelValue(spec.data.defaultValue);
        }

        function getModelValue() {
            return model.value;
        }

        // VALIDATION

        function validate() {
            return Promise.try(function() {
                var selectedItem = getControlValue(),
                    validationConstraints = {
                        min_length: 1,
                        max_length: 10000,
                        required: spec.data.constraints.required
                    };
                return Validation.validateText(selectedItem, validationConstraints);
            });
        }

        function fetchData(searchTerm) {
            searchTerm = searchTerm || '';
            if (dataSource === 'ftp_staging') {
                return fileStaging.searchFiles(searchTerm);
            } else {
                // dynamic service plugin stubs!
                return [];
            }
        }

        function doChange() {
            validate()
                .then(function(result) {
                    if (result.isValid) {
                        model.value = result.parsedValue;
                        channel.emit('changed', {
                            newValue: result.parsedValue
                        });
                    } else if (result.diagnosis === 'required-missing') {
                        model.value = spec.data.nullValue;
                        channel.emit('changed', {
                            newValue: spec.data.nullValue
                        });
                    }
                    channel.emit('validation', {
                        errorMessage: result.errorMessage,
                        diagnosis: result.diagnosis
                    });
                });
        }

        /**
         * Formats the display of an object in the dropdown.
         id: "data/bulk/wjriehl/subfolder/i_am_a_file.txt"
         isFolder: false
         mtime: 1508441424000
         name: "i_am_a_file.txt"
         path: "data/bulk/wjriehl/subfolder/i_am_a_file.txt"
         size: 0
         text: "data/bulk/wjriehl/subfolder/i_am_a_file.txt"
         */
        function formatObjectDisplay(file) {
            console.log('formatObjectDisplay: ', file);
            if (!file.id) {
                return $('<div style="display:block; height:20px">').append(file.text);
            }
            return $(div([
                span({ style: 'word-wrap: break-word' }, [
                    file.subdir,
                    b(file.name)
                ]),
                div({ style: 'margin-left: 7px' }, [
                    'Size: ' + StringUtil.readableBytes(file.size) + '<br>',
                    'Uploaded ' + TimeFormat.getTimeStampStr(file.mtime, true)
                ])
            ]));
        }

        /*
         * Creates the markup
         * Places it into the dom node
         * Hooks up event listeners
         */
        function render() {
            return Promise.try(function() {
                var events = Events.make(),
                    inputControl = makeInputControl(events),
                    content = div({ class: 'input-group', style: { width: '100%' } }, inputControl);

                ui.setContent('input-container', content);

                $(ui.getElement('input-container.input')).select2({
                    templateResult: formatObjectDisplay,
                    templateSelection: function(object) {
                        if (!object.id) {
                            return object.text;
                        }
                        return object.id; //model.availableValues[object.id].path;
                    },
                    ajax: {
                        delay: 250,
                        transport: function(params, success, failure) {
                            return fetchData(params.data.term)
                                .then(function(data) {
                                    data.forEach(function(file) {
                                        file.id = file.path;
                                        file.text = file.path;
                                    });
                                    success({results: data});
                                })
                                .catch(function(err) {
                                    console.error(err);
                                    failure(err);
                                });
                        }
                    }
                }).on('change', function() {
                    doChange();
                }).on('advanced-shown.kbase', function(e) {
                    $(e.target).select2({ width: 'resolve' });
                });
                events.attachEvents(container);
            });
        }

        /*
         * In the layout we set up an environment in which one or more parameter
         * rows may be inserted.
         * For the objectInput, there is only ever one control.
         */
        function layout(events) {
            var content = div({
                dataElement: 'main-panel'
            }, [
                div({ dataElement: 'input-container' })
            ]);
            return {
                content: content,
                events: events
            };
        }

        function autoValidate() {
            return validate()
                .then(function(result) {
                    channel.emit('validation', {
                        errorMessage: result.errorMessage,
                        diagnosis: result.diagnosis
                    });
                });
        }

        // LIFECYCLE API
        function start(arg) {
            return Promise.try(function() {
                parent = arg.node;
                container = parent.appendChild(document.createElement('div'));
                ui = UI.make({ node: container });

                var events = Events.make(),
                    theLayout = layout(events);

                container.innerHTML = theLayout.content;
                events.attachEvents(container);

                if (config.initialValue !== undefined) {
                    // note this might come from a different workspace...
                    model.value = config.initialValue;
                }

                return render()
                    .then(function() {
                        channel.on('reset-to-defaults', function() {
                            resetModelValue();
                        });
                        channel.on('update', function(message) {
                            setModelValue(message.value);
                        });
                        setControlValue(getModelValue());
                        autoValidate();
                    });
            });
        }

        function stop() {
            return Promise.try(function() {
                if (container) {
                    parent.removeChild(container);
                }
                bus.stop();
                eventListeners.forEach(function(id) {
                    runtime.bus().removeListener(id);
                });
            });
        }

        // INIT


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
