'use strict';

const Transformer   = require('shark-transformer');
const CssComb       = require('csscomb');
const extend        = require('node.extend');
const co            = require('co');
const VError        = require('verror');
const path          = require('path');

const loggerOpName = 'csscomb';

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
			if (!this.logger.inPipe()) {
				this.logger.info({
					opName: loggerOpName,
					opType: this.logger.OP_TYPE.STARTED
				}, path.basename(destPath));
			}

			var result = comb.processString(css);

			this.logger.info({
				opName: loggerOpName,
				opType: this.logger.OP_TYPE.FINISHED_SUCCESS,
				duration: time.delta(),
				size: {before: sizeBefore, after: result.length}
			}, this.logger.inPipe() ? '' : path.basename(destPath));

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
		var options = extend({}, this.options, srcCollection.getOptions().cssComb);

		if (options.enabled === false) {
			this.logger.info('%s disabled, passing...', loggerOpName);
			return;
		}

		srcCollection.forEach(function(srcFile) {
			var result = this.renderCssComb(
				srcFile.getContent(),
				destPath
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