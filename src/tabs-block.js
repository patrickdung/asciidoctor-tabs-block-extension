/* Copyright (c) 2018 OpenDevise, Inc.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

/**
 * Extends the AsciiDoc syntax to support a tabset. The tabset is created from
 * a dlist enclosed in an example block that is marked with the tabs style.
 *
 * Usage:
 *
 *  [tabs]
 *  ====
 *  Tab A::
 *  +
 *  --
 *  Contents of tab A.
 *  --
 *  Tab B::
 *  +
 *  --
 *  Contents of tab B.
 *  --
 *  ====
 *
 * @author Dan Allen <dan@opendevise.com>
 */
const Opal = global.Opal;
const IdSeparatorCh = '-'
const ExtraIdSeparatorsRx = /^-+|-+$|-(-)+/g
const InvalidIdCharsRx = /[^a-zA-Z0-9_]/g
//const List = Opal.const_get_local(Opal.module(null, 'Asciidoctor'), 'List')
//const ListItem = Opal.const_get_local(Opal.module(null, 'Asciidoctor'), 'ListItem')

const generateId = (str, idx) =>
  `tabset${idx}_${str.toLowerCase().replace(InvalidIdCharsRx, IdSeparatorCh).replace(ExtraIdSeparatorsRx, '$1')}`

function tabsBlock () {
  this.named('tabs')
  this.onContext('example')
  this.process((parent, reader, attrs) => {
    const createHtmlFragment = (html) => this.createBlock(parent, 'pass', html)
    const tabsetIdx = parent.getDocument().counter('idx-tabset')
    const nodes = []
    nodes.push(createHtmlFragment('<div class="tabset is-loading">'))
    const container = this.parseContent(this.createBlock(parent, 'open'), reader)
    const sourceTabs = container.getBlocks()[0]
    if (!(sourceTabs && sourceTabs.getContext() === 'dlist' && sourceTabs.getItems().length)) return
    //const tabs = List.$new(parent, 'ulist')
    const tabs = this.createList(parent, 'ulist')
    tabs.addRole('tabs')
    const panes = {}
    sourceTabs.getItems().forEach(([[title], details]) => {
      //const tab = ListItem.$new(tabs)
      const tab = this.createListItem(parent)
      tabs.$append(tab)
      const id = generateId(title.getText(), tabsetIdx)
      tab.text = `[[${id}]]${title.text}`
      let blocks = details.getBlocks()
      const numBlocks = blocks.length
      if (numBlocks) {
        if (blocks[0].context === 'open' && numBlocks === 1) blocks = blocks[0].getBlocks()
        panes[id] = blocks.map((block) => (block.parent = parent) && block)
      }
    })
    nodes.push(tabs)
    nodes.push(createHtmlFragment('<div class="content">'))
    Object.entries(panes).forEach(([id, blocks]) => {
      nodes.push(createHtmlFragment(`<div class="tab-pane" aria-labelledby="${id}">`))
      nodes.push(...blocks)
      nodes.push(createHtmlFragment('</div>'))
    })
    nodes.push(createHtmlFragment('</div>'))
    nodes.push(createHtmlFragment('</div>'))
    parent.blocks.push(...nodes)
  })
}

/*
function register (registry) {
  registry.block('tabs', tabsBlock)
}

module.exports.register = register
*/

module.exports.register = function (registry, config = {}) {
  function doRegister (registry) {
    // if (typeof registry.docinfoProcessor === 'function') {
    // registry.docinfoProcessor(tabsetDocinfoProcessor)
    // } else {
    //   console.warn('no \'docinfoProcessor\' method on alleged registry')
    // }
    if (typeof registry.block === 'function') {
      registry.block('tabs', tabsBlock)
    } else {
      console.warn('no \'block\' method on alleged registry')
    }
  }

  if (typeof registry.register === 'function') {
    registry.register(function () {
      //Capture the global registry so processors can register more extensions.
      registry = this
      doRegister(registry)
    })
  } else {
    doRegister(registry)
  }
  return registry
}
