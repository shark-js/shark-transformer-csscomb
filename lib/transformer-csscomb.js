'use strict';

const WatcherNonInterruptibleError = require('shark-watcher').NonInterruptibleError;
const Transformer   = require('shark-transformer');
const CssComb       = require('csscomb');
const extend        = require('node.extend');
const co            = require('co');
const VError        = require('verror');
const path          = require('path');

const loggerOpName = 'transformer-csscomb';

module.exports = Transformer.extend({
	optionsDefault: {

	},

	init: function() {
		this.options = extend({}, this.optionsDefault, this.options);
	},

	renderCssComb: function(css, destPath) {
		var time = this.logger.time();
		var sizeBefore = css.length;

		try {
			var comb = new CssComb('yandex');
			this.logger.info({
				opName: loggerOpName,
				opType: this.logger.OP_TYPE.STARTED
			}, path.basename(destPath));

			var result = comb.processString(css);

			this.logger.info({
				opName: loggerOpName,
				opType: this.logger.OP_TYPE.FINISHED_SUCCESS,
				duration: time.delta(),
				size: {before: sizeBefore, after: result.length}
			}, path.basename(destPath));

			return result;
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