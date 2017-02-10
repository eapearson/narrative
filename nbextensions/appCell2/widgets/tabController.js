// TODO - in  progress
define([
    'bluebird'
], function (
    Promise
) {

    function factory(config) {

        var tabsDef = config.tabs;

        var hostNode, container;

        function loadWidget(name) {
            return new Promise(function (resolve, reject) {
                require('./tabs/' + name, function (Widget) {
                    resolve(Widget);
                }, function (err) {
                    reject(err);
                });
            });
        }

        function startTab(tabId) {
            var selectedTab = tabsDef.tabs[tabId];

            if (selectedTab.widgetModule) {
                return loadWidget(selectedTab.widgetModule)
                    .then(function (Widget) {
                        tabsDef.selectedTab = {
                            id: tabId,
                            widget: Widget.make()
                        };

                        ui.activateButton(tabsDef.selectedTab.id);

                        var node = document.createElement('div');
                        ui.getElement('run-control-panel.tab-pane.widget').appendChild(node);

                        return tabsDef.selectedTab.widget.start({
                            node: node
                        });
                    });
            }
            tabsDef.selectedTab = {
                id: tabId,
                widget: selectedTab.widget.make({
                    model: model
                })
            };

            ui.activateButton(tabsDef.selectedTab.id);

            var node = document.createElement('div');
            ui.getElement('run-control-panel.tab-pane.widget').appendChild(node);

            return tabsDef.selectedTab.widget.start({
                    node: node,
                    model: model
                })
                .catch(function (err) {
                    console.error('Error starting tab', err);
                    throw err;
                });
        }

        function stopTab() {
            ui.deactivateButton(tabsDef.selectedTab.id);

            return tabsDef.selectedTab.widget.stop()
                .catch(function (err) {
                    console.error('ERROR stopping', err);
                })
                .finally(function () {
                    var widgetNode = ui.getElement('run-control-panel.tab-pane.widget');
                    if (widgetNode.firstChild) {
                        widgetNode.removeChild(widgetNode.firstChild);
                    }
                    tabsDef.selectedTab = null;
                });
        }

        function selectTab(tabId) {
            if (tabsDef.selectedTab) {
                if (tabsDef.selectedTab.id === tabId) {
                    return;
                }
                return stopTab()
                    .then(function () {
                        return startTab(tabId);
                    });
            }
            return startTab(tabId);
        }

        function unselectTab() {
            if (tabsDef.selectedTab) {
                // close the tab
                return stopTab();
            }
        }

        function hidePane() {
            return Promise.try(function () {
                var paneNode = ui.getElement('run-control-panel.tab-pane');
                if (paneNode) {
                    paneNode.classList.add('hidden');
                }
            });
        }

        function showPane() {
            return Promise.try(function () {
                var paneNode = ui.getElement('run-control-panel.tab-pane');
                if (paneNode) {
                    paneNode.classList.remove('hidden');
                }
            });
        }

        function selectedTabId() {
            if (tabsDef.selectedTab) {
                return tabsDef.selectedTab.id;
            }
            return null;
        }

        /*
         * If tab not open, close any open one and open it.
         * If tab open, close it, leaving no tabs open.
         */
        // Track whether the user has selected a tab.
        // This is reset when the user closes a tab.
        var userSelectedTab = false;

        function toggleTab(tabId) {
            if (tabsDef.selectedTab) {
                if (tabsDef.selectedTab.id === tabId) {
                    return stopTab()
                        .then(function () {
                            // hide the pane, since we just closed the only open
                            //tab.
                            return hidePane();
                        })
                        .then(function () {
                            userSelectedTab = false;
                        });
                }
                return stopTab()
                    .then(function () {
                        return startTab(tabId);
                    })
                    .then(function () {
                        userSelectedTab = true;
                    });
            }
            return showPane()
                .then(function () {
                    startTab(tabId);
                })
                .then(function () {
                    userSelectedTab = true;
                });
        }

        function start(arg) {
            return Promise.try(function () {
                

            });
        }

        function stop() {
            return Promise.try(function () {

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