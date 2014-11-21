'use strict';

const WatcherNonInterruptibleError = require('shark-watcher').NonInterruptibleError;
const Transformer   = require('shark-transformer');
const CssComb       = require('csscomb');
const extend        = require('node.extend');
const co            = require('co');
const VError        = require('verror');

module.exports = Transformer.extend({
	optionsDefault: {

	},

	init: function() {
		this.options = extend({}, this.optionsDefault, this.options);
	},

	renderCssComb: function(css) {
		try {
			var comb = new CssComb('yandex');
			return comb.processString(css);
		}
		catch (error) {
			throw new VError(error, 'CssComb error');
		}
	},

	transformTree: function *() {
		return this.tree.forEachDestSeries(co.wrap(function *(destPath, srcCollection, done) {
			try {
				yield this.transformTreeConcreteDest(destPath, srcCollection);
				done();
			}
			catch (error) {
				done(new VError(error, 'CssComb#transformTree'));
			}
		}.bind(this)));
	},

	transformTreeConcreteDest: function *(destPath, srcCollection) {
		srcCollection.forEach(function(srcFile) {
			var result = this.renderCssComb(
				srcFile.getContent()
			);
			srcFile.setContent(result);
		}.bind(this));
	},

	treeToTree: function *() {
		yield this.tree.fillContent();
		yield this.transformTree();

		return this.tree;
	}
});