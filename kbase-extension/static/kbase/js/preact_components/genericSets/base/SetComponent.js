define([
    '../../ShowError',
    'bootstrap'
], function (
    ShowError
) {
    'use strict';

    // Ugly but true - preact is loaded globally by Jupyter and not as an AMD module.
    const { h, Component } = window.preact;

    const rowStyle = {
        flex: '0 0 auto',
        display: 'flex',
        flexDirection: 'row',
        marginBottom: '4px'
    };
    const col1Style = {
        fontWeight: 'bold',
        color: 'rgba(100, 100, 100)',
        flex: '0 0 15em'
    };
    const col2Style = {
        flex: '1 1 0px'
    };

    class SetComponent extends Component {
        constructor(props) {
            super(props);
            this.state = {
                error: null
            }
            this.tabsRef = null;
        }

        renderError() {
            return h(ShowError, {
                error: this.state.error
            });
        }

        selectItem(event) {
            const selectControl = event.target;
            this.props.selectItem(selectControl.value);
        }

        renderItemType() {
            const item = this.props.currentItem.value;
            if (!item) {
                return;
            }
            return h('a', {
                href: `/#spec/type/${item.objectInfo.type}`,
                target: '_blank'
            }, item.objectInfo.type);
        }

        renderSelector() {
            return [
                h('div', {
                    style: col1Style
                }, 'Select alignment to view:'),
                h('div', {
                    className: 'form-inline',
                    style: col2Style
                }, h('div', { className: 'form-group' }, [
                    h('select', {
                        onChange: this.selectItem.bind(this),
                        className: 'form-control',
                        style: {
                            marginLeft: '0',
                            marginRight: '0'
                        }
                    }, this.props.items.value.map((item) => {
                        const { label, ref, info } = item;
                        return h('option', { value: item.ref }, [
                            h('span', null, [
                                item.objectInfo.name,
                                '(', label, ')'
                            ])]);
                    }))
                ]))
            ];
        }

        renderHeader() {
            return h('div', {
                style: {
                    display: 'flex',
                    flexDirection: 'column ',
                    marginBottom: '10px'
                }
            }, [
                h('div', {
                    style: rowStyle
                }, [
                    h('div', {
                        style: col1Style
                    }, 'Alignment type:'),
                    h('div', {
                        style: col2Style,
                    }, this.renderItemType())
                ]),
                h('div', {
                    style: rowStyle
                }, this.renderSelector()),
            ]);
        }

        clickTab(e) {
            e.preventDefault();
            const tabID = e.target.getAttribute('href').substr(1);
            const tab = e.target.parentNode;
            const tabPanels = tab.parentNode.nextSibling;
            const panel = tabPanels.querySelector('#' + tabID);
            console.log(tabID, tab, tabPanels);

            // iterate through siblings until none are active.
            const tabs = tab.parentNode;
            for (let tab of [].slice.call(tabs.childNodes)) {
                tab.classList.remove('active');
            }

            tab.classList.add('active');

            // same for panels
            for (let panel of [].slice.call(tabPanels.childNodes)) {
                panel.classList.remove('active', 'in');
            }
            panel.classList.add('active', 'in');
        }

        renderTabs() {
            return h('div', {
                ref: (x) => {
                    this.tabsRef = x;
                }
            }, [
                h('ul', {
                    className: 'nav nav-tabs',
                    role: "tablist"
                }, [
                    h('li', {
                        role: 'presentation',
                        className: 'active'
                    }, h('a', {
                        href: '#overview',
                        role: 'tab',
                        dataToggle: 'tab',
                        ariaControls: 'overview',
                        onClick: this.clickTab.bind(this)
                    }, 'Overview')),
                    // An example of a second tab.
                    // I have a feeling that tabs will need to move into the
                    // subclass if there is significant divergence.
                    // On the other hand, we may want to start with implementing tabs
                    // for common views across set types - comparison (all instances
                    // of a set in a table), metadata (about the set itself).
                    // Maybe custom visualizations can just be provided as an array 
                    // of tab specs.
                    // h('li', {
                    //     role: 'presentation'
                    // }, h('a', {
                    //     href: '#info',
                    //     role: 'tab',
                    //     dataToggle: 'tab',
                    //     ariaControls: 'info',
                    //     onClick: this.clickTab.bind(this)
                    // }, 'Info'))
                ]),
                h('div', {
                    className: 'tab-content',
                    style: {
                        paddingTop: '10px'
                    }
                }, [
                    h('div', {
                        role: 'tabpanel',
                        className: 'tab-pane fade in active',
                        id: 'overview'
                    }, this.renderOverview()),
                    // An example of a second tab panel area.
                    // h('div', {
                    //     role: 'tabpanel',
                    //     className: 'tab-pane fade',
                    //     id: 'info'
                    // }, 'info here')

                ])
            ])
        }

        renderOverview() {
            return h('div', null, [
                this.renderHeader(),
                // The item area
                h('div', {
                    style: {
                        position: 'relative'
                    }
                }, [
                    h('div', {
                        style: {
                            position: 'absolute',
                            left: 0,
                            right: 0,
                            top: 0,
                            bottom: 0
                        }
                    }, this.renderLoading()),
                    h('div', {
                        style: {
                            minHeight: '5em'
                        }
                    }, this.renderItemTable())
                ])
            ]);
        }

        renderNoItems() {
            return h('div', null, 'Sorry, no items');
        }

        renderLoading() {
            if (!this.props.currentItem.loading) {
                return;
            }

            return h('div', {
                style: {
                    position: 'absolute',
                    left: 0,
                    right: 0,
                    top: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center'
                }
            }, h('i', {
                className: `fa fa-spinner fa-3x fa-pulse fa-fw`
            }));
        }

        render() {
            const items = this.props.items.value;
            if (!items || items.length === 0) {
                return this.renderNoItems();
            } else {
                return this.renderViewer();
            }
        }

        renderViewer() {
            return this.renderTabs();
        }
    }

    return SetComponent;
});
