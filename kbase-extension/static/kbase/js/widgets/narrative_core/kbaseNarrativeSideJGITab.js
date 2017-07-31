/*global define*/
/*jslint white: true*/
/**
 * "Import" tab on data side panel.
 * @author Roman Sutormin <rsutormin@lbl.gov>
 * @public
 */
define([
    'knockout',
    'kbwidget',
    'bootstrap',
    'handlebars',
    'jquery',
    'bluebird',
    'narrativeConfig',
    'kbaseAuthenticatedWidget',
    'base/js/namespace',
    'kbase-generic-client-api',
    'util/icon',
    'util/string',
    'util/bootstrapDialog',
    'kb_common/html',
    'text!kbase/templates/data_slideout/object_row.html',
    'text!kbase/templates/data_slideout/action_button_partial.html',
    'text!kbase/templates/data_slideout/jgi_data_policy.html',
    'text!kbase/templates/data_slideout/data_policy_panel.html'
], function(
    ko,
    KBWidget,
    bootstrap,
    Handlebars,
    $,
    Promise,
    Config,
    kbaseAuthenticatedWidget,
    Jupyter,
    GenericClient,
    Icon,
    StringUtil,
    BootstrapDialog,
    html,
    StagingRowHtml,
    ActionButtonHtml,
    JGIDataPolicyHtml,
    DataPolicyPanelHtml
) {
    'use strict';

    var t = html.tag,
        div = t('div'),
        input = t('input'),
        span = t('span');

    function viewModel(params) {

        // The free-form search input.
        var searchInput = ko.observable();

        // Simple state used for ui-busy state. Set true when a search api call is begin, 
        // false when it is finished (finally).
        var searching = ko.observable(false);

        function doSearch() {
            searching(true);
            console.log('searching...');
            searching(false);
        }

        return {
            searchInput: searchInput,
            searching: searching,
            doSearch: doSearch
        };
    }

    /*
        Builds the search input area using bootstrap styling and layout.
    */
    function buildInputArea() {
        return div({
            class: 'form'
        }, div({
            class: 'input-group'
        }, [
            input({
                class: 'form-control',
                dataBind: {
                    textInput: 'searchInput',
                    hasFocus: true
                },
                placeholder: 'Search JGI Public Data'
            }),
            div({
                class: 'input-group-addon',
                style: {
                    cursor: 'pointer'
                },
                dataBind: {
                    click: 'doSearch'
                }
            }, span({
                class: 'fa fa-search',
                style: {
                    fontSize: '125%',
                    color: '#000'
                },
                dataBind: {
                    style: {
                        color: 'searching() ? "green" : "#000"'
                    }
                }
            }))
        ]));
    }

    function buildOutputArea() {
        return div({
            class: 'well'
        }, [
            div({
                dataBind: {
                    text: 'searchInput'
                }
            })
        ]);
    }

    function template() {
        return div({}, [
            buildInputArea(),
            buildOutputArea()
        ]);
    }

    function component() {
        return {
            viewModel: viewModel,
            template: template()
        };
    }
    ko.components.register('jgisearch/search', component());

    var JGISearchWidget = Object.create({}, {
        init: {
            value: function(config) {
                this.node = config.node;
                this.workspaceName = config.workspaceName;
                return this;
            }
        },
        render: {
            value: function() {
                this.node.innerHTML = div({}, [
                    div({
                        dataBind: {
                            component: {
                                name: '"jgisearch/search"',
                                params: {}
                            }
                        }
                    })
                ]);
                ko.applyBindings({}, this.node);
            }
        }
    });

    function factory(config) {
        return Object.create(JGISearchWidget).init(config);
    }

    return factory;
});