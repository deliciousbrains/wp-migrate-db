(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var $ = jQuery;
var MigrationProgressModel = require( 'MigrationProgress-model' );
var MigrationProgressView = require( 'MigrationProgress-view' );
var $overlayOriginal = $( '<div id="overlay" class="hide"></div>' );
var $progressContentOriginal = $( '.progress-content' ).clone().addClass( 'hide' );
var $proVersion = $( '.pro-version' ).addClass( 'hide' );

$overlayOriginal.append( $proVersion );

var MigrationProgressController = {
	migration: {
		model: {},
		view: {},
		$progress: {},
		$wrapper: {},
		$overlay: {},
		status: 'active',
		title: '',
		text: '',
		timerCount: 0,
		elapsedInterval: 0,
		currentStageNum: 0,
		counterDisplay: false,
		originalTitle: document.title,
		setTitle: function( title ) {
			this.$progress.find( '.progress-title' ).html( title );
			this.title = title;
		},
		setStatus: function( status ) {
			this.$progress
				.removeClass( this.status )
				.addClass( ( 'error' === status ) ? 'wpmdb-error' : status );

			// Possible statuses include: 'error', 'paused', 'complete', 'cancelling'
			if ( 'error' === status ) {
				this.$progress.find( '.progress-text' ).addClass( 'migration-error' );
			}

			this.status = status;

			this.updateTitleElem();
		},
		setText: function( text ) {
			if ( 'string' !== typeof text ) {
				text = '';
			}

			if ( 0 >= text.indexOf( 'wpmdb_error' ) ) {
				text = this.decodeErrorObject( text );
			}

			this.$progress.find( '.progress-text' ).html( text );
			this.text = text;
		},
		setState: function( title, text, status ) {
			if ( null !== title ) {
				this.setTitle( title );
			}
			if ( null !== text ) {
				this.setText( text );
			}
			if ( null !== status ) {
				this.setStatus( status );
			}
		},
		startTimer: function() {
			this.timerCount = 0;
			this.counterDisplay = $( '.timer' );
			this.elapsedInterval = setInterval( this.incrementTimer, 1000 );
		},
		pauseTimer: function() {
			clearInterval( this.elapsedInterval );
		},
		resumeTimer: function() {
			this.elapsedInterval = setInterval( this.incrementTimer, 1000 );
		},
		incrementTimer: function() {
			wpmdb.current_migration.timerCount = wpmdb.current_migration.timerCount + 1;
			wpmdb.current_migration.displayCount();
		},
		displayCount: function() {
			var hours = Math.floor( this.timerCount / 3600 ) % 24;
			var minutes = Math.floor( this.timerCount / 60 ) % 60;
			var seconds = this.timerCount % 60;
			var display = this.pad( hours, 2, 0 ) + ':' + this.pad( minutes, 2, 0 ) + ':' + this.pad( seconds, 2, 0 );
			this.counterDisplay.html( display );
		},
		updateTitleElem: function() {
			var activeStage = this.model.get( 'activeStageName' );
			var stageModel = this.model.getStageModel( activeStage );
			var percentDone = Math.max( 0, stageModel.getTotalProgressPercent() );
			var numStages = this.model.get( 'stages' ).length;
			var currentStage = this.currentStageNum;
			var currentStatus = this.status;
			var progressText = wpmdb_strings.title_progress;

			if ( 'complete' === stageModel.get( 'status' ) && 0 === stageModel.get( 'totalSize' ) ) {
				percentDone = 100;
			}

			progressText = progressText.replace( '%1$s', percentDone + '%' );
			progressText = progressText.replace( '%2$s', currentStage );
			progressText = progressText.replace( '%3$s', numStages );

			if ( 1 === numStages ) {
				progressText = percentDone + '%';
			}

			if ( wpmdb_strings[ 'title_' + currentStatus ] ) {
				progressText = wpmdb_strings[ 'title_' + currentStatus ];
			}

			progressText = progressText + ' - ' + this.originalTitle;

			document.title = progressText;
		},
		restoreTitleElem: function() {
			document.title = this.originalTitle;
		},
		pad: function( num, width, padChar ) {
			padChar = padChar || '0';
			num = num + '';
			return num.length >= width ? num : new Array( width - num.length + 1 ).join( padChar ) + num;
		},

		// fixes error objects that have been mangled by html encoding
		decodeErrorObject: function( input ) {
			var inputDecoded = input
				.replace( /\{&quot;/g, '{#q!#' )
				.replace( /\&quot;}/g, '#q!#}' )
				.replace( /,&quot;/g, ',#q!#' )
				.replace( /&quot;:/g, '#q!#:' )
				.replace( /:&quot;/g, ':#q!#' )
				.replace( /&quot;/g, '\\"' )
				.replace( /#q!#/g, '"' )
				.replace( /&gt;/g, '>' )
				.replace( /&lt;/g, '<' );
			try {
				inputDecoded = JSON.parse( inputDecoded );
			} catch ( e ) {
				return input;
			}
			return ( 'object' === typeof inputDecoded && 'undefined' !== typeof inputDecoded.body ) ? inputDecoded : input;
		}
	},
	newMigration: function( settings ) {
		$( '#overlay' ).remove();
		$( '.progress-content' ).remove();
		this.migration.$overlay = $overlayOriginal.clone();

		$( '#wpwrap' ).append( this.migration.$overlay );

		this.migration.model = new MigrationProgressModel( settings );
		this.migration.view = new MigrationProgressView( {
			model: this.migration.model
		} );

		this.migration.$progress = $progressContentOriginal.clone();
		this.migration.$wrapper = this.migration.$progress.find( '.migration-progress-stages' );
		this.migration.$proVersion = this.migration.$overlay.find( '.pro-version' );

		var proVersionIFrame = this.migration.$proVersion.find( 'iframe' ).remove().clone();

		this.migration.$wrapper.replaceWith( this.migration.view.$el );
		this.migration.$overlay.prepend( this.migration.$progress );

		// timeout needed so class is added after elements are appended to dom and transition runs.
		var self = this;
		setTimeout( function() {
			self.migration.$overlay.add( self.migration.$progress ).add( self.migration.$proVersion ).removeClass( 'hide' ).addClass( 'show' );
			if ( self.migration.$proVersion.length ) {
				setTimeout( function() {
					self.migration.$proVersion.find( '.iframe' ).append( proVersionIFrame );
				}, 500 );
			}
		}, 0 );

		// Stick stage progress to top of container
		// this.migration.$progress.find( '.migration-progress-stages' ).scroll( function() {
		//	$( this ).find( '.stage-progress' ).css( 'top', $( this ).scrollTop() );
		// } );
		// TODO: resolve ^

		this.migration.currentStageNum = 0;

		this.migration.$proVersion.on( 'click', '.close-pro-version', function() {
			self.migration.$proVersion.find( 'iframe' ).remove();
			self.migration.$proVersion.addClass( 'hide remove' );
			setTimeout( function() {
				self.migration.$proVersion.remove();
			}, 500 );
		} );

		this.migration.model.on( 'migrationComplete', function() {
			self.utils.updateProgTableVisibilitySetting();
			self.utils.updatePauseBeforeFinalizeSetting();
			self.migration.pauseTimer();
		} );

		return this.migration;
	},
	utils: require( 'MigrationProgress-utils' )
};

module.exports = MigrationProgressController;

},{"MigrationProgress-model":2,"MigrationProgress-utils":3,"MigrationProgress-view":4}],2:[function(require,module,exports){
var MigrationProgressStageModel = require( 'MigrationProgressStage-model' );
var $ = jQuery;

var MigrationProgressModel = Backbone.Model.extend( {
	defaults: {
		_initialStages: null,
		stages: null,
		activeStageName: null,
		stageModels: null,
		localTableRows: null,
		localTableSizes: null,
		remoteTableRows: null,
		remoteTableSizes: null,
		migrationStatus: 'active',
		migrationIntent: 'savefile'
	},
	initialize: function() {
		this.set( 'stageModels', {} );
		this.set( '_initialStages', this.get( 'stages' ) );
		this.set( 'stages', [] );
		_.each( this.get( '_initialStages' ), function( stage, items, dataType ) {
			this.addStage( stage.name, items, dataType );
		}, this );
	},
	addStage: function( name, items, dataType, extend ) {
		var itemsArr = [];
		var stage;

		_.each( items, function( item ) {
			var size, rows;

			if ( 'remote' === dataType ) {
				size = this.get( 'remoteTableSizes' )[ item ];
				rows = this.get( 'remoteTableRows' )[ item ];
			} else {
				size = this.get( 'localTableSizes' )[ item ];
				rows = this.get( 'localTableRows' )[ item ];
			}

			itemsArr.push( {
				name: item,
				size: size,
				rows: rows
			} );
		}, this );

		stage = {
			name: name,
			items: itemsArr,
			dataType: dataType
		};

		if ( 'object' === typeof extend ) {
			stage = $.extend( stage, extend );
		}

		this.addStageModel( stage );

		this.trigger( 'stage:added', this.get( 'stageModels' )[ name ] );
		this.get( 'stageModels' )[ name ].on( 'change', function() {
			this.trigger( 'change' );
		}, this );

		return this.getStageModel( stage.name );
	},
	addStageItem: function( stage, name, size, rows ) {
		this.getStageModel( stage ).addItem( name, size, rows );
	},
	addStageModel: function( stage ) {
		var stages = this.get( 'stages' );
		var stageModels = this.get( 'stageModels' );
		var newStageModel = new MigrationProgressStageModel( stage );

		stages.push( stage );
		stageModels[ stage.name ] = newStageModel;

		this.set( 'stages', stages );
		this.set( 'stageModels', stageModels );
	},
	getStageModel: function( name ) {
		return this.get( 'stageModels' )[ name ];
	},
	getStageItems: function( stage, map ) {
		var stageModel = this.getStageModel( stage );
		var items = stageModel.get( 'items' );

		if ( undefined === map ) {
			return items;
		} else {
			return items.map( function( item ) {
				return item[ map ];
			} );
		}
	},
	setActiveStage: function( stage ) {
		this.setStageComplete();
		this.set( 'activeStageName', stage );
		this.getStageModel( stage ).set( 'status', 'active' );
		this.trigger( 'change:activeStage' );
	},
	setStageComplete: function( stage ) {
		if ( ! stage ) {
			stage = this.get( 'activeStageName' );
		}
		if ( null !== stage ) {
			this.getStageModel( stage ).set( 'status', 'complete' );
		}

		wpmdb.current_migration.currentStageNum = wpmdb.current_migration.currentStageNum + 1;
	},
	setMigrationComplete: function() {
		var lastStage = this.getStageModel( this.get( 'activeStageName' ) );
		this.setStageComplete();
		this.trigger( 'migrationComplete' );
		this.set( 'migrationStatus', 'complete' );
		lastStage.activateTab();
	}
} );

module.exports = MigrationProgressModel;

},{"MigrationProgressStage-model":5}],3:[function(require,module,exports){
var $ = jQuery;

module.exports = {
	updateProgTableVisibilitySetting: function() {
		if ( ! wpmdb_data.prog_tables_visibility_changed ) {
			return;
		}
		wpmdb_data.prog_tables_visibility_changed = false;

		$.ajax( {
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_save_setting',
				nonce: wpmdb_data.nonces.save_setting,
				setting: 'prog_tables_hidden',
				checked: Boolean( wpmdb_data.prog_tables_hidden )
			},
			error: function( jqXHR, textStatus, errorThrown ) {
				console.log( 'Could not save progress item visibility setting', errorThrown );
			}
		} );
	},
	updatePauseBeforeFinalizeSetting: function() {
		if ( ! wpmdb_data.pause_before_finalize_changed ) {
			return;
		}
		wpmdb_data.pause_before_finalize_changed = false;

		$.ajax( {
			url: ajaxurl,
			type: 'POST',
			dataType: 'text',
			cache: false,
			data: {
				action: 'wpmdb_save_setting',
				nonce: wpmdb_data.nonces.save_setting,
				setting: 'pause_before_finalize',
				checked: Boolean( wpmdb_data.pause_before_finalize )
			},
			error: function( jqXHR, textStatus, errorThrown ) {
				console.log( 'Could not save pause before finalize setting', errorThrown );
			}
		} );
	}
};

},{}],4:[function(require,module,exports){
var MigrationProgressStageView = require( './MigrationProgressStage-view.js' );
var $ = jQuery;

var MigrationProgressView = Backbone.View.extend( {
	tagName: 'div',
	className: 'migration-progress-stages',
	id: 'migration-progress-stages',
	self: this,
	initialize: function() {
		this.$el.empty();

		this.model.on( 'stage:added', function( stageModel ) {
			this.addStageView( stageModel );
		}, this );

		_.each( this.model.get( 'stageModels' ), this.addStageView, this );
	},
	addStageView: function( stageModel ) {
		var newStageSubView = new MigrationProgressStageView( {
			model: stageModel
		} );
		stageModel.trigger( 'view:initialized', newStageSubView );
		this.$el.append( newStageSubView.$el );
		this.$el.parent().find( '.stage-tabs' ).append( newStageSubView.$tabElem );
	}
} );

module.exports = MigrationProgressView;

},{"./MigrationProgressStage-view.js":6}],5:[function(require,module,exports){
var $ = jQuery;

var MigrationProgressStage = Backbone.Model.extend( {
	defaults: {
		status: 'queued',
		_initialItems: null,
		items: null,
		lookupItems: null,
		totalSize: 0,
		totalTransferred: 0,
		dataType: 'local',
		name: '',
		itemsComplete: 0,
		strings: null
	},
	initialize: function() {
		this.initStrings();

		this.set( '_initialItems', this.get( 'items' ).slice() );
		this.set( 'items', [] );
		this.set( 'lookupItems', {} );

		_.each( this.get( '_initialItems' ), function( item ) {
			this.addItem( item.name, item.size, item.rows );
		}, this );

		this.on( 'view:initialized', this.triggerItemViewInit );

		this.on( 'change', function() {
			wpmdb.current_migration.updateTitleElem();
		} );
	},
	initStrings: function() {
		var default_strings = {
			stage_title: this.get( 'name' ),
			migrated: wpmdb_strings.migrated,
			queued: wpmdb_strings.queued,
			active: wpmdb_strings.running,
			complete: wpmdb_strings.complete,
			hide: wpmdb_strings.hide,
			show: wpmdb_strings.show,
			itemsName: wpmdb_strings.tables
		};
		var strings = this.get( 'strings' );

		strings = ( 'object' === typeof strings ) ? strings : {};
		strings = $.extend( default_strings, strings );

		strings.items_migrated = strings.itemsName + ' ' + strings.migrated;
		strings.hide_items = strings.hide + ' ' + strings.itemsName;
		strings.show_items = strings.show + ' ' + strings.itemsName;

		this.set( 'strings', strings );
	},
	addItem: function( name, size, rows ) {
		var items = this.get( 'items' );
		var item = {
			name: name,
			size: size || 1,
			rows: rows || size,
			stageName: this.get( 'name' ),
			$el: null,
			transferred: 0,
			rowsTransferred: 0,
			complete: false
		};

		items.push( item );
		this.get( 'lookupItems' )[ name ] = items.length - 1;

		this.set( 'totalSize', parseInt( this.get( 'totalSize' ) ) + parseInt( size ) );
		this.trigger( 'item:added', item );
	},
	triggerItemViewInit: function() {
		var items = this.get( 'items' );
		var self = this;
		_.each( items, function( item ) {
			self.trigger( 'item:added', item );
		} );
	},
	getTotalSizeTransferred: function() {
		return this.get( 'totalTransferred' );
	},
	countItemsComplete: function() {
		return this.get( 'itemsComplete' );
	},
	getTotalProgressPercent: function() {
		var transferred = this.getTotalSizeTransferred();
		var total = this.get( 'totalSize' );
		if ( 0 >= transferred || 0 >= total ) {
			return 0;
		}
		return Math.min( 100, Math.round( ( transferred / total  ) * 100 ) );
	},
	activateTab: function() {
		this.trigger( 'activateTab' );
	},
	setItemComplete: function( itemName ) {
		var item = this.getItemByName( itemName );
		var totalTransferred = this.get( 'totalTransferred' );
		var itemsComplete = this.get( 'itemsComplete' );

		this.set( 'itemsComplete', ++itemsComplete );

		totalTransferred += item.size - item.transferred;
		this.set( 'totalTransferred', totalTransferred );

		item.transferred = item.size;
		item.complete = true;
		item.rowsTransferred = item.rows;
		this.trigger( 'change change:items', item );
	},
	setItemRowsTransferred: function( itemName, numRows ) {
		var amtDone, estTransferred;
		var item = this.getItemByName( itemName );
		var totalTransferred = this.get( 'totalTransferred' );

		if ( -1 === parseInt( numRows ) ) {
			amtDone = 1;
		} else {
			amtDone = Math.min( 1, numRows / item.rows );
		}

		if ( 1 === amtDone ) {
			this.setItemComplete( itemName );
			return;
		}

		estTransferred = item.size * amtDone;

		totalTransferred += estTransferred - item.transferred;
		this.set( 'totalTransferred', totalTransferred );

		item.transferred = estTransferred;
		item.rowsTransferred = numRows;
		this.trigger( 'change change:items', item );
	},
	getItemByName: function( itemName ) {
		var item = this.get( 'items' )[ this.get( 'lookupItems' )[ itemName ] ] || {};
		if ( itemName === item.name ) {
			return item;
		} else {
			return this.determineItemByName( itemName );
		}
	},
	determineItemByName: function( itemName ) {
		var items = this.get( 'items' );
		for ( var index = 0; index < items.length; index++ ) {
			var item = items[ index ];
			if ( itemName === item.name ) {
				this.get( 'lookupItems' ).itemName = index;
				return item;
			}
		}
	}
} );

module.exports = MigrationProgressStage;

},{}],6:[function(require,module,exports){
var $ = jQuery;

var MigrationProgressStageView = Backbone.View.extend( {
	tagName: 'div',
	className: 'migration-progress-stage-container hide-tables',
	$totalProgressElem: null,
	$tabElem: null,
	$showHideTablesElem: null,
	$pauseBeforeFinalizeElem: null,
	$pauseBeforeFinalizeCheckbox: null,
	$itemsContainer: null,
	itemViews: null,
	maxDomNodes: 100,
	visibleDomNodes: 0,
	queuedElements: null,
	$truncationNotice: null,
	$truncationNoticeHiddenItems: null,
	initialize: function() {
		this.$el.empty();
		this.$el.attr( 'data-stage', this.model.get( 'name' ) ).addClass( 'queued ' + this.model.get( 'name' ) );

		this.queuedElements = [];

		this.initTotalProgressElem();
		this.$el.prepend( this.$totalProgressElem );

	    this.$itemsContainer = $( '<div class=progress-items />' );
		this.$el.append( this.$itemsContainer );

		this.initTabElem();

		this.model.on( 'item:added', this.maybeAddElementToView, this );

		_.each( this.model.get( 'itemModels' ), this.maybeAddElementToView, this );
		this.model.on( 'change', function() {
			this.updateProgressElem();
			this.updateStageTotals();
		}, this );

		this.model.on( 'change:status', function( e ) {
			this.$el.removeClass( 'queued active' ).addClass( this.model.get( 'status' ) );
			this.$tabElem.removeClass( 'queued active' ).addClass( this.model.get( 'status' ) )
				.find( '.stage-status' ).text( this.model.get( 'strings' )[ this.model.get( 'status' ) ] );
		}, this );

		this.model.on( 'change:items', function( item ) {
			if ( item.name ) {
				this.setItemProgress( item );
			}
		}, this );
	},
	initTotalProgressElem: function() {
		this.initShowHideTablesElem();
		this.initPauseBeforeFinalizeElem();

		this.$totalProgressElem = $( '<div class=stage-progress />' )
			.append( '<span class=percent-complete>0</span>% ' + this.model.get( 'strings' ).complete + ' ' )
			.append( '(<span class=size-complete>0 MB</span> / <span class=size-total>0 MB</span>) ' )
			.append( '<span class=tables-complete>0</span> <span class=lowercase >of</span> <span class=tables-total>0</span> ' + this.model.get( 'strings' ).items_migrated )
			.append( this.$showHideTablesElem )
			.append( '<div class=progress-bar-wrapper><div class=progress-bar /></div>' );

		this.updateStageTotals();
	},
	initShowHideTablesElem: function() {
		this.$showHideTablesElem = $( '<a class=show-hide-tables/>' ).text( this.model.get( 'strings' ).show_items );
		var self = this;
		this.$showHideTablesElem.on( 'click show-hide-progress-tables', function() {
			var progTablesHidden;
			if ( self.$el.hasClass( 'hide-tables' ) ) { // show tables
				progTablesHidden = false;
				self.$el.add( self.$el.siblings() ).removeClass( 'hide-tables' );
				self.$showHideTablesElem.text( self.model.get( 'strings' ).hide_items );
			} else { // hide tables
				progTablesHidden = true;
				self.$el.add( self.$el.siblings() ).addClass( 'hide-tables' );
				self.$showHideTablesElem.text( self.model.get( 'strings' ).show_items );
			}

			if ( Boolean( progTablesHidden ) !== Boolean( wpmdb_data.prog_tables_hidden ) ) {
				wpmdb_data.prog_tables_visibility_changed = true;
				wpmdb_data.prog_tables_hidden = progTablesHidden;
			}
		} );

		// show progress tables on init if hidden is false
		if ( ! wpmdb_data.prog_tables_hidden ) {
			this.$showHideTablesElem.triggerHandler( 'show-hide-progress-tables' );
		}

		// make sure text reflects current state when showing
		this.model.on( 'change:status activateTab', function() {
			if ( wpmdb_data.prog_tables_hidden ) {
				self.$showHideTablesElem.text( self.model.get( 'strings' ).show_items );
			} else {
				self.$showHideTablesElem.text( self.model.get( 'strings' ).hide_items );
			}
		} );

		this.model.on( 'activateTab', function() {
			if ( 'complete' === wpmdb.current_migration.model.get( 'migrationStatus' ) ) {
				self.$tabElem.addClass( 'active' ).siblings().removeClass( 'active' );
				self.$el.addClass( 'active' ).siblings().removeClass( 'active' );
			}
		} );
	},
	initPauseBeforeFinalizeElem: function() {
		this.$pauseBeforeFinalizeElem = $( '.pause-before-finalize' );
		this.$pauseBeforeFinalizeCheckbox = this.$pauseBeforeFinalizeElem.find( 'input[type=checkbox]' );
		var self = this;
		var isChecked = false;
		var migrationIntent = wpmdb.current_migration.model.get( 'migrationIntent' );

		// make sure checkbox is checked based on current state
		if ( wpmdb_data.pause_before_finalize ) {
			isChecked = true;
		}
		this.$pauseBeforeFinalizeCheckbox.prop( 'checked', isChecked );

		// only display on pushes and pulls
		if ( 'push' === migrationIntent || 'pull' === migrationIntent ) {
			this.$pauseBeforeFinalizeElem.show();
		} else {
			this.$pauseBeforeFinalizeElem.hide();
		}

		// hide on media stage
		wpmdb.current_migration.model.on( 'change:activeStage', function() {
			if ( 'media' === wpmdb.current_migration.model.get( 'activeStageName' ) ) {
				self.$pauseBeforeFinalizeElem.hide();
			}
		} );

		this.$pauseBeforeFinalizeElem.on( 'click', function() {
			var pauseBeforeFinalizeValue = Boolean( self.$pauseBeforeFinalizeCheckbox.is( ':checked' ) );
			if ( pauseBeforeFinalizeValue !== Boolean( wpmdb_data.pause_before_finalize ) ) {
				wpmdb_data.pause_before_finalize_changed = true;
				wpmdb_data.pause_before_finalize = pauseBeforeFinalizeValue;
			}
		} );
	},
	initTabElem: function() {
		var self = this;
		this.$tabElem = $( '<a class=stage-tab>' )
			.append( '<span class=stage-title>' + this.model.get( 'strings' ).stage_title + '</span> ' )
			.append( '<span class=stage-status>' + this.model.get( 'strings' ).queued + '</span> ' )
			.on( 'click', function() {
				self.model.activateTab();
			} );
	},
	updateProgressElem: function() {
		var percentDone = Math.max( 0, this.model.getTotalProgressPercent() );
		var sizeDone = wpmdb.functions.convertKBSizeToHRFixed( Math.min( this.model.getTotalSizeTransferred(), this.model.get( 'totalSize' ) ) );
		var tablesDone = Math.min( this.model.countItemsComplete(), this.model.get( 'items' ).length );

		if ( 'complete' === this.model.get( 'status' ) && 0 === this.model.get( 'totalSize' ) ) {
			percentDone = 100;
			this.$showHideTablesElem.fadeOut();
		}

		this.$totalProgressElem.find( '.percent-complete' ).text( percentDone );
		this.$totalProgressElem.find( '.size-complete' ).text( sizeDone );
		this.$totalProgressElem.find( '.tables-complete' ).text( wpmdb_add_commas( tablesDone ) );
		this.$totalProgressElem.find( '.progress-bar-wrapper .progress-bar' ).css( { width: percentDone + '%' } );
	},
	updateStageTotals: function() {
		var itemCount = this.model.get( 'items' ).length;
		this.$totalProgressElem.find( '.tables-total' ).text( wpmdb_add_commas( itemCount ) );
		this.$totalProgressElem.find( '.size-total' ).text( wpmdb.functions.convertKBSizeToHR( this.model.get( 'totalSize' ) ) );
	},
	initializeItemElement: function( item ) {
		var $el = $( '<div class="item-progress" />' );
		var $progress = $( '<div class="progress-bar"/>' ).css( 'width', '0%' );
		var $title = $( '<p>' ).addClass( 'item-info' )
			.append( $( '<span class="name" />' ).text( item.name ) )
			.append( ' ' )
			.append( $( '<span class="size" />' ).text( '(' + wpmdb.functions.convertKBSizeToHRFixed( item.size ) + ')' ) );

		$el.append( $title );
		$el.append( $progress );
		$el.append( '<span class="dashicons dashicons-yes"/>' );

		$el.attr( 'id', 'item-' + item.name );
		$el.attr( 'data-stage', this.model.get( 'name' ) );

		item.$el = $el;
		item.$progress = $progress;
		item.$title = $title;

		return item;
	},
	maybeAddElementToView: function( item ) {
		if ( this.visibleDomNodes < this.maxDomNodes ) {
			++this.visibleDomNodes;
			this.$itemsContainer.append( this.initializeItemElement( item ).$el );
		} else {
			this.queuedElements.push( item );
			if ( ! this.$truncationNotice ) {
				this.showTruncationNotice();
			} else {
				this.updateTruncationNotice();
			}
		}
	},
	showTruncationNotice: function() {
		if ( this.$truncationNotice ) {
			return;
		}
		this.$truncationNotice = $( '<div class="truncation-notice" >' + wpmdb_strings.progress_items_truncated_msg.replace( '%1$s', '<span class="hidden-items">' + wpmdb_add_commas( this.queuedElements.length ) + '</span>' ) + '</div>' );
		this.$truncationNoticeHiddenItems = this.$truncationNotice.find( '.hidden-items' );
		this.$itemsContainer.after( this.$truncationNotice );
	},
	updateTruncationNotice: function() {
		this.$truncationNoticeHiddenItems.text( wpmdb_add_commas( this.queuedElements.length ) );
	},
	getNextElementForView: function( $el ) {
		var queueItem;
		if ( this.queuedElements.length ) {
			if ( $el ) {
				this.queuedElements.push( $el );
			}
			queueItem = this.queuedElements.shift();
			if ( queueItem instanceof $ ) {
				$el = queueItem;
			} else {
				$el = this.initializeItemElement( queueItem ).$el;
			}
		}
		return $el;
	},
	setItemProgress: function( item ) {
		var percentDone = Math.min( 100, Math.ceil( 100 * ( item.transferred / item.size ) ) );
		item.$progress.css( 'width', percentDone + '%' );
		if ( 100 <= percentDone ) {
			this.elemComplete( item );
		}
	},
	elemComplete: function( item ) {
		var $el = item.$el.addClass( 'complete' );
		var $nextEl  = this.getNextElementForView( $el );

		var height = $el.height();
		var marginBottom = $el.css( 'margin-bottom' );

		var $clone = $nextEl.clone().css( { height: 0, marginBottom: 0 } ).addClass( 'clone' );
		$clone.appendTo( this.$itemsContainer );
		$el.css( { height: height, marginBottom: marginBottom } );

		setTimeout( function() {
			$el.css( { height: 0, marginBottom: 0 } );
			$clone.css( { height: height, marginBottom: marginBottom } );

			setTimeout( function() {
				$el.css( { height: 'auto', marginBottom: marginBottom } ).remove();
				$clone.remove();
				this.$itemsContainer.find( '.item-progress:not(.clone)' ).last().after( $nextEl.css( { height: 'auto', marginBottom: marginBottom } ) );
			}.bind( this ), 250 );

		}.bind( this ), 1000 );

	}
} );

module.exports = MigrationProgressStageView;

},{}],7:[function(require,module,exports){
(function( $, wpmdb ) {

	var connection_established = false;
	var last_replace_switch = '';
	var doing_ajax = false;
	var doing_licence_registration_ajax = false;
	var doing_reset_api_key_ajax = false;
	var doing_save_profile = false;
	var doing_plugin_compatibility_ajax = false;
	var profile_name_edited = false;
	var checked_licence = false;
	var show_prefix_notice = false;
	var show_ssl_notice = false;
	var show_version_notice = false;
	var migration_completed = false;
	var currently_migrating = false;
	var dump_filename = '';
	var dump_path = '';
	var migration_intent;
	var remote_site;
	var secret_key;
	var form_data;
	var stage;
	var elapsed_interval;
	var completed_msg;
	var tables_to_migrate = '';
	var migration_paused = false;
	var previous_progress_title = '';
	var previous_progress_text_primary = '';
	var previous_progress_text_secondary = '';
	var migration_cancelled = false;
	var flag_skip_delay = false;
	var delay_between_requests = 0;
	var fade_duration = 400;
	var pause_before_finalize = false;
	var is_auto_pause_before_finalize = false;

	wpmdb.migration_progress_controller = require( 'MigrationProgress-controller' );
	wpmdb.current_migration = null;

	var admin_url = ajaxurl.replace( '/admin-ajax.php', '' ), spinner_url = admin_url + '/images/spinner';

	if ( 2 < window.devicePixelRatio ) {
		spinner_url += '-2x';
	}
	spinner_url += '.gif';
	var ajax_spinner = '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" />';

	window.onbeforeunload = function( e ) {
		if ( currently_migrating ) {
			e = e || window.event;

			// For IE and Firefox prior to version 4
			if ( e ) {
				e.returnValue = wpmdb_strings.sure;
			}

			// For Safari
			return wpmdb_strings.sure;
		}
	};

	function pad( n, width, z ) {
		z = z || '0';
		n = n + '';
		return n.length >= width ? n : new Array( width - n.length + 1 ).join( z ) + n;
	}

	function is_int( n ) {
		n = parseInt( n );
		return 'number' === typeof n && 0 === n % 1;
	}

	function get_intersect( arr1, arr2 ) {
		var r = [], o = {}, l = arr2.length, i, v;
		for ( i = 0; i < l; i++ ) {
			o[ arr2[ i ] ] = true;
		}
		l = arr1.length;
		for ( i = 0; i < l; i++ ) {
			v = arr1[ i ];
			if ( v in o ) {
				r.push( v );
			}
		}
		return r;
	}

	function get_query_var( name ) {
		name = name.replace( /[\[]/, '\\[' ).replace( /[\]]/, '\\]' );
		var regex = new RegExp( '[\\?&]' + name + '=([^&#]*)' ),
			results = regex.exec( location.search );
		return null === results ? '' : decodeURIComponent( results[ 1 ].replace( /\+/g, ' ' ) );
	}

	function maybe_show_ssl_warning( url, key, remote_scheme ) {
		var scheme = url.substr( 0, url.indexOf( ':' ) );
		if ( remote_scheme !== scheme && url.indexOf( 'https' ) !== -1 ) {
			$( '.ssl-notice' ).show();
			show_ssl_notice = true;
			url = url.replace( 'https', 'http' );
			$( '.pull-push-connection-info' ).val( url + '\n' + key );
			return;
		}
		show_ssl_notice = false;
		return;
	}

	function maybe_show_prefix_notice( prefix ) {
		if ( prefix !== wpmdb_data.this_prefix ) {
			$( '.remote-prefix' ).html( prefix );
			show_prefix_notice = true;
			if ( 'pull' === wpmdb_migration_type() ) {
				$( '.prefix-notice.pull' ).show();
			} else {
				$( '.prefix-notice.push' ).show();
			}
		}
	}

	function maybe_show_mixed_cased_table_name_warning() {
		if ( 'undefined' === typeof wpmdb.common.connection_data || false === wpmdb.common.connection_data ) {
			return;
		}

		var migration_intent = wpmdb_migration_type();
		var tables_to_migrate = get_tables_to_migrate( null, null );

		$( '.mixed-case-table-name-notice' ).hide();

		if ( null === tables_to_migrate ) {
			return;
		}

		tables_to_migrate = tables_to_migrate.join( '' );

		// The table names are all lowercase, no need to display the warning.
		if ( tables_to_migrate === tables_to_migrate.toLowerCase() ) {
			return;
		}

		/*
		 * Do not display the warning if the remote lower_case_table_names does not equal "1" (i.e the only problematic setting)
		 * Applies to push/export migrations.
		 */
		if ( '1' !== wpmdb.common.connection_data.lower_case_table_names && ( 'push' === migration_intent || 'savefile' === migration_intent ) ) {
			return;
		}

		/*
		 * Do not display the warning if the local lower_case_table_names does not equal "1" (i.e the only problematic setting)
		 * Only applies to pull migrations.
		 */
		if ( '1' !== wpmdb_data.lower_case_table_names && 'pull' === migration_intent ) {
			return;
		}

		/*
		 * At this stage we've determined:
		 * 1. The source database contains at least one table that contains an uppercase character.
		 * 2. The destination environment has lower_case_table_names set to 1.
		 * 3. The source database table containing the uppercase letter will be converted to lowercase during the migration.
		 */

		if ( 'push' === migration_intent || 'savefile' === migration_intent ) {
			$( '.mixed-case-table-name-notice.push' ).show();
		} else {
			$( '.mixed-case-table-name-notice.pull' ).show();
		}
	}

	function get_domain_name( url ) {
		var temp_url = url;
		var domain = temp_url.replace( /\/\/(.*)@/, '//' ).replace( 'http://', '' ).replace( 'https://', '' ).replace( 'www.', '' );
		return domain;
	}

	function get_migration_status_label( url, intent, stage ) {
		var domain = get_domain_name( url );
		var migrating_stage_label, completed_stage_label;
		if ( 'pull' === intent ) {
			migrating_stage_label = wpmdb_strings.pull_migration_label_migrating;
			completed_stage_label = wpmdb_strings.pull_migration_label_completed;
		} else {
			migrating_stage_label = wpmdb_strings.push_migration_label_migrating;
			completed_stage_label = wpmdb_strings.push_migration_label_completed;
		}

		migrating_stage_label = migrating_stage_label.replace( /\%s(\S*)\s?/, '<span class=domain-label>' + domain + '$1</span>&nbsp;' );
		completed_stage_label = completed_stage_label.replace( /\%s\s?/, '<span class=domain-label>' + domain + '</span>&nbsp;' );

		if ( 'migrating' === stage ) {
			return migrating_stage_label;
		} else {
			return completed_stage_label;
		}
	}

	function remove_protocol( url ) {
		return url.replace( /^https?:/i, '' );
	}

	function disable_export_type_controls() {
		$( '.option-group' ).each( function( index ) {
			$( 'input', this ).attr( 'disabled', 'disabled' );
			$( 'label', this ).css( 'cursor', 'default' );
		} );
	}

	function enable_export_type_controls() {
		$( '.option-group' ).each( function( index ) {
			$( 'input', this ).removeAttr( 'disabled' );
			$( 'label', this ).css( 'cursor', 'pointer' );
		} );
	}

	function set_slider_value( parent_selector, value, unit, display ) {
		var display_value = value;

		if ( undefined !== display ) {
			display_value = display;
		}

		$( '.slider', parent_selector ).slider( 'value', parseInt( value ) );
		$( '.amount', parent_selector ).html( wpmdb_add_commas( display_value ) + ' ' + unit );
	}

	function set_pause_resume_button( event ) {
		if ( true === migration_paused ) {
			migration_paused = false;
			doing_ajax = true;

			wpmdb.current_migration.setState( previous_progress_title, previous_progress_text_primary, 'active' );
			$( '.pause-resume' ).html( wpmdb_strings.pause );

			// Resume the timer
			wpmdb.current_migration.resumeTimer();

			wpmdb.functions.execute_next_step();
		} else {
			migration_paused = true;
			doing_ajax = false;
			previous_progress_title = $( '.progress-title' ).html();
			previous_progress_text_primary = $( '.progress-text', '.progress-wrapper-primary' ).html();
			previous_progress_text_secondary = $( '.progress-text', '.progress-wrapper-secondary ' ).html();

			wpmdb.current_migration.setState( wpmdb_strings.migration_paused, wpmdb_strings.completing_current_request, null );
			$( 'body' ).off( 'click', '.pause-resume' ); // Is re-bound at execute_next_step when migration is finally paused
			$( 'body' ).off( 'click', '.cancel' ); // Is re-bound at execute_next_step when migration is finally paused
		}
	}

	function create_table_select( tables, table_sizes_hr, selected_tables ) {
		var $table_select = document.createElement( 'select' );
		$( $table_select ).attr( {
			multiple: 'multiple',
			name: 'select_tables[]',
			id: 'select-tables',
			class: 'multiselect'
		} );

		if ( 0 < tables.length ) {
			$.each( tables, function( index, table ) {
				if ( $.wpmdb.apply_filters( 'wpmdb_exclude_table', false, table ) ) {
					return;
				}

				var selected = ' ';
				if ( undefined !== selected_tables && null !== selected_tables && 0 < selected_tables.length && -1 !== $.inArray( table, selected_tables ) ) {
					selected = ' selected="selected" ';
				}
				$( $table_select ).append( '<option' + selected + 'value="' + table + '">' + table + ' (' + table_sizes_hr[ table ] + ')</option>' );
			} );
		}

		return $table_select;
	}

	/**
	 * Returns tables selected for migration.
	 *
	 * @param value
	 * @param args
	 * @returns {string}
	 *
	 * Also handler for wpmdb_get_tables_to_migrate filter, disregards input values as it is the primary source.
	 */
	function get_tables_to_migrate( value, args ) {
		var tables = '';
		var mig_type = wpmdb_migration_type();
		var table_intent = $( 'input[name=table_migrate_option]:checked' ).val();

		// Grab tables as per what the user has selected from the multiselect box or all prefixed tables.
		if ( 'migrate_select' === table_intent ) {
			tables = $( '#select-tables' ).val();
		} else {
			if ( 'pull' !== mig_type && 'undefined' !== typeof wpmdb_data.this_prefixed_tables ) {
				tables = wpmdb_data.this_prefixed_tables;
			}
			if ( 'pull' === mig_type && 'undefined' !== typeof wpmdb.common.connection_data && 'undefined' !== typeof wpmdb.common.connection_data.prefixed_tables ) {
				tables = wpmdb.common.connection_data.prefixed_tables;
			}
		}

		return tables;
	}

	function get_table_prefix( value, args ) {
		return $( '.table-select-wrap .table-prefix' ).text();
	}

	function lock_replace_url( lock ) {
		if ( true === lock ) {
			$( '.replace-row.pin .replace-right-col input[type="text"]' ).attr( 'readonly', 'readonly' );
			$( '.replace-row.pin .arrow-col' ).addClass( 'disabled' );
		} else {
			$( '.replace-row.pin .replace-right-col input[type="text"]' ).removeAttr( 'readonly' );
			$( '.replace-row.pin .arrow-col' ).removeClass( 'disabled' );
		}
	}

	function set_connection_data( data ) {
		wpmdb.common.previous_connection_data = wpmdb.common.connection_data;
		wpmdb.common.connection_data = data;
		$.wpmdb.do_action( 'wpmdb_connection_data_updated', data );
	}

	/**
	 * Returns formatted info for the Max Request Size slider.
	 *
	 * @param value
	 * @return object
	 */
	function get_max_request_display_info( value ) {
		var display_info = {};

		display_info.unit = 'MB';
		display_info.amount = ( value / 1024 ).toFixed( 2 );

		return display_info;
	}

	$( document ).ready( function() {
		wpmdb.migration_state_id = '';

		$( '#plugin-compatibility' ).change( function( e ) {
			var install = '1';
			var $status = $( this ).closest( 'td' ).next( 'td' ).find( '.setting-status' );

			if ( $( this ).is( ':checked' ) ) {
				var answer = confirm( wpmdb_strings.mu_plugin_confirmation );

				if ( !answer ) {
					$( this ).prop( 'checked', false );
					return;
				}
			} else {
				install = '0';
			}

			$( '.plugin-compatibility-wrap' ).toggle();

			$status.find( '.ajax-success-msg' ).remove();
			$status.append( ajax_spinner );
			$( '#plugin-compatibility' ).attr( 'disabled', 'disabled' );
			$( '.plugin-compatibility' ).addClass( 'disabled' );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_plugin_compatibility',
					install: install
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.plugin_compatibility_settings_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText );
					$( '.ajax-spinner' ).remove();
					$( '#plugin-compatibility' ).removeAttr( 'disabled' );
					$( '.plugin-compatibility' ).removeClass( 'disabled' );
				},
				success: function( data ) {
					if ( '' !== $.trim( data ) ) {
						alert( data );
					} else {
						$status.append( '<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>' );
						$( '.ajax-success-msg' ).fadeOut( 2000, function() {
							$( this ).remove();
						} );
					}
					$( '.ajax-spinner' ).remove();
					$( '#plugin-compatibility' ).removeAttr( 'disabled' );
					$( '.plugin-compatibility' ).removeClass( 'disabled' );
				}
			} );

		} );

		if ( $( '#plugin-compatibility' ).is( ':checked' ) ) {
			$( '.plugin-compatibility-wrap' ).show();
		}

		if ( 0 <= navigator.userAgent.indexOf( 'MSIE' ) || 0 <= navigator.userAgent.indexOf( 'Trident' ) ) {
			$( '.ie-warning' ).show();
		}

		if ( 0 === wpmdb_data.valid_licence ) {
			$( '#savefile' ).prop( 'checked', true );
		}
		var max_request_size_container = $( '.max-request-size' );
		var max_request_size_slider = $( '.slider', max_request_size_container );
		max_request_size_slider.slider( {
			range: 'min',
			value: parseInt( wpmdb_data.max_request / 1024 ),
			min: 512,
			max: parseInt( wpmdb_data.bottleneck / 1024 ),
			step: 256,
			create: function( event, ui ) {
				var display_info = get_max_request_display_info( wpmdb_data.max_request / 1024 );
				set_slider_value( max_request_size_container, wpmdb_data.max_request / 1024, display_info.unit, display_info.amount );
			},
			slide: function( event, ui ) {
				var display_info = get_max_request_display_info( ui.value );
				set_slider_value( max_request_size_container, ui.value, display_info.unit, display_info.amount );
			},
			stop: function( event, ui ) {
				$( '.slider-success-msg' ).remove();
				$( '.amount', max_request_size_container ).after( '<img src="' + spinner_url + '" alt="" class="slider-spinner general-spinner" />' );
				max_request_size_slider.slider( 'disable' );

				$.ajax( {
					url: ajaxurl,
					type: 'POST',
					cache: false,
					data: {
						action: 'wpmdb_update_max_request_size',
						max_request_size: parseInt( ui.value ),
						nonce: wpmdb_data.nonces.update_max_request_size
					},
					error: function( jqXHR, textStatus, errorThrown ) {
						max_request_size_slider.slider( 'enable' );
						$( '.slider-spinner', max_request_size_container ).remove();
						alert( wpmdb_strings.max_request_size_problem );
						var display_info = get_max_request_display_info( wpmdb_data.max_request / 1024 );
						set_slider_value( max_request_size_container, wpmdb_data.max_request / 1024, display_info.unit, display_info.amount );
						max_request_size_slider.slider( 'enable' );
					},
					success: function() {
						max_request_size_slider.slider( 'enable' );
						$( '.slider-label-wrapper', max_request_size_container ).append( '<span class="slider-success-msg">' + wpmdb_strings.saved + '</span>' );
						$( '.slider-success-msg', max_request_size_container ).fadeOut( 2000, function() {
							$( this ).remove();
						} );
						$( '.slider-spinner', max_request_size_container ).remove();
					}
				} );
			}
		} );

		var delay_between_requests_container = $( '.delay-between-requests' );
		var delay_between_requests_slider = $( '.slider', delay_between_requests_container );
		delay_between_requests_slider.slider( {
			range: 'min',
			value: parseInt( wpmdb_data.delay_between_requests / 1000 ),
			min: 0,
			max: 10,
			step: 1,
			create: function( event, ui ) {
				set_slider_value( delay_between_requests_container, wpmdb_data.delay_between_requests / 1000, 's' );
			},
			slide: function( event, ui ) {
				set_slider_value( delay_between_requests_container, ui.value, 's' );
			},
			stop: function( event, ui ) {
				$( '.slider-success-msg' ).remove();
				$( '.amount', delay_between_requests_container ).after( '<img src="' + spinner_url + '" alt="" class="slider-spinner general-spinner" />' );
				delay_between_requests_slider.slider( 'disable' );

				$.ajax( {
					url: ajaxurl,
					type: 'POST',
					cache: false,
					data: {
						action: 'wpmdb_update_delay_between_requests',
						delay_between_requests: parseInt( ui.value * 1000 ),
						nonce: wpmdb_data.nonces.update_delay_between_requests
					},
					error: function( jqXHR, textStatus, errorThrown ) {
						delay_between_requests_slider.slider( 'enable' );
						$( '.slider-spinner', delay_between_requests_container ).remove();
						alert( wpmdb_strings.delay_between_requests_problem );
						set_slider_value( delay_between_requests_container, wpmdb_data.delay_between_requests / 1000, 's' );
						delay_between_requests_slider.slider( 'enable' );
					},
					success: function() {
						wpmdb_data.delay_between_requests = parseInt( ui.value * 1000 );
						delay_between_requests_slider.slider( 'enable' );
						$( '.slider-label-wrapper', delay_between_requests_container ).append( '<span class="slider-success-msg">' + wpmdb_strings.saved + '</span>' );
						$( '.slider-success-msg', delay_between_requests_container ).fadeOut( 2000, function() {
							$( this ).remove();
						} );
						$( '.slider-spinner', delay_between_requests_container ).remove();
					}
				} );
			}
		} );

		var $push_select = $( '#select-tables' ).clone();
		var $pull_select = $( '#select-tables' ).clone();
		var $push_post_type_select = $( '#select-post-types' ).clone();
		var $pull_post_type_select = $( '#select-post-types' ).clone();
		var $push_select_backup = $( '#select-backup' ).clone();
		var $pull_select_backup = $( '#select-backup' ).clone();

		$( '.help-tab .video' ).each( function() {
			var $container = $( this ),
				$viewer = $( '.video-viewer' );

			$( 'a', this ).click( function( e ) {
				e.preventDefault();

				$viewer.attr( 'src', '//www.youtube.com/embed/' + $container.data( 'video-id' ) + '?autoplay=1' );
				$viewer.show();
				var offset = $viewer.offset();
				$( window ).scrollTop( offset.top - 50 );
			} );
		} );

		$( '.backup-options' ).show();
		$( '.keep-active-plugins' ).show();
		if ( 'savefile' === wpmdb_migration_type() ) {
			$( '.backup-options' ).hide();
			$( '.keep-active-plugins' ).hide();
		}

		last_replace_switch = wpmdb_migration_type();

		function check_licence( licence ) {
			checked_licence = true;
			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_check_licence',
					licence: licence,
					context: 'all',
					nonce: wpmdb_data.nonces.check_licence
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.license_check_problem );
				},
				success: function( data ) {

					var $support_content = $( '.support-content' );
					var $addons_content = $( '.addons-content' );
					var $licence_content = $( '.licence-status:not(.notification-message)' );
					var licence_msg, support_msg, addons_msg;

					if ( 'undefined' !== typeof data.dbrains_api_down ) {
						support_msg = data.dbrains_api_down + data.message;
						addons_msg = data.dbrains_api_down;
					} else if ( 'undefined' !== typeof data.errors ) {

						if ( 'undefined' !== typeof data.errors.subscription_expired ) {
							licence_msg = data.errors.subscription_expired.licence;
							support_msg = data.errors.subscription_expired.support;
							addons_msg = data.errors.subscription_expired.addons;
						} else {
							var msg = '';
							for ( var key in data.errors ) {
								msg += data.errors[ key ];
							}
							support_msg = msg;
							addons_msg = msg;
						}
						if ( 'undefined' !== typeof data.addon_content ) {
							addons_msg += '\n' + data.addon_content;
						}
					} else {
						support_msg = data.message;
						addons_msg = data.addon_content;
					}

					$licence_content.stop().fadeOut( fade_duration, function() {
						$( this )
							.css( { visibility: 'hidden', display: 'block' } ).slideUp()
							.empty()
							.html( licence_msg )
							.stop()
							.fadeIn( fade_duration );
					} );
					$support_content.stop().fadeOut( fade_duration, function() {
						$( this )
							.empty()
							.html( support_msg )
							.stop()
							.fadeIn( fade_duration );
					} );
					$addons_content.stop().fadeOut( fade_duration, function() {
						$( this )
							.empty()
							.html( addons_msg )
							.stop()
							.fadeIn( fade_duration );
					} );

				}
			} );
		}

		/**
		 * Handle 'Check License Again' functionality found in expired license messages.
		 */
		$( '.content-tab' ).on( 'click', '.check-my-licence-again', function( e ) {
			e.preventDefault();
			checked_licence = false;
			$( e.target ).replaceWith( 'Checking... ' + ajax_spinner );
			check_licence( null, 'all' );
		} );
		function refresh_table_selects() {
			if ( undefined !== wpmdb_data && undefined !== wpmdb_data.this_tables && undefined !== wpmdb_data.this_table_sizes_hr ) {
				$push_select = create_table_select( wpmdb_data.this_tables, wpmdb_data.this_table_sizes_hr, $( $push_select ).val() );
			}

			if ( undefined !== wpmdb.common.connection_data && undefined !== wpmdb.common.connection_data.tables && undefined !== wpmdb.common.connection_data.table_sizes_hr ) {
				$pull_select = create_table_select( wpmdb.common.connection_data.tables, wpmdb.common.connection_data.table_sizes_hr, $( $pull_select ).val() );
			}
		}

		$.wpmdb.add_action( 'wpmdb_refresh_table_selects', refresh_table_selects );

		function update_push_table_select() {
			$( '#select-tables' ).remove();
			$( '.select-tables-wrap' ).prepend( $push_select );
			$( '#select-tables' ).change();
		}

		$.wpmdb.add_action( 'wpmdb_update_push_table_select', update_push_table_select );

		function update_pull_table_select() {
			$( '#select-tables' ).remove();
			$( '.select-tables-wrap' ).prepend( $pull_select );
			$( '#select-tables' ).change();
		}

		$.wpmdb.add_action( 'wpmdb_update_pull_table_select', update_pull_table_select );

		function disable_table_migration_options() {
			$( '#migrate-selected' ).parents( '.option-section' ).children( '.header-expand-collapse' ).children( '.expand-collapse-arrow' ).removeClass( 'collapsed' );
			$( '.table-select-wrap' ).show();
			$( '#migrate-only-with-prefix' ).prop( 'checked', false );
			$( '#migrate-selected' ).prop( 'checked', true );
			$( '.table-migrate-options' ).hide();
			$( '.select-tables-wrap' ).show();
		}

		$.wpmdb.add_action( 'wpmdb_disable_table_migration_options', disable_table_migration_options );

		function enable_table_migration_options() {
			$( '.table-migrate-options' ).show();
		}

		$.wpmdb.add_action( 'wpmdb_enable_table_migration_options', enable_table_migration_options );

		function select_all_tables() {
			$( '#select-tables' ).children( 'option' ).prop( 'selected', true );
			$( '#select-tables' ).change();
		}

		$.wpmdb.add_action( 'wpmdb_select_all_tables', select_all_tables );

		function base_old_url( value, args ) {
			return remove_protocol( wpmdb_data.this_url );
		}

		$.wpmdb.add_filter( 'wpmdb_base_old_url', base_old_url );

		function establish_remote_connection_from_saved_profile() {
			var action = wpmdb_migration_type();
			var connection_info = $.trim( $( '.pull-push-connection-info' ).val() ).split( '\n' );
			if ( 'undefined' === typeof wpmdb_default_profile || true === wpmdb_default_profile || 'savefile' === action || doing_ajax || !wpmdb_data.is_pro ) {
				return;
			}

			doing_ajax = true;
			disable_export_type_controls();

			$( '.connection-status' ).html( wpmdb_strings.establishing_remote_connection );
			$( '.connection-status' ).removeClass( 'notification-message error-notice migration-error' );
			$( '.connection-status' ).append( ajax_spinner );

			var intent = wpmdb_migration_type();

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_verify_connection_to_remote_site',
					url: connection_info[ 0 ],
					key: connection_info[ 1 ],
					intent: intent,
					nonce: wpmdb_data.nonces.verify_connection_to_remote_site,
					convert_post_type_selection: wpmdb_convert_post_type_selection,
					profile: wpmdb_data.profile
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					$( '.connection-status' ).html( get_ajax_errors( jqXHR.responseText, '(#102)', jqXHR ) );
					$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						$( '.connection-status' ).html( data.body );
						$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );

						if ( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$( '.basic-access-auth-wrapper' ).show();
						}

						return;
					}

					maybe_show_ssl_warning( connection_info[ 0 ], connection_info[ 1 ], data.scheme );
					maybe_show_prefix_notice( data.prefix );

					$( '.pull-push-connection-info' ).addClass( 'temp-disabled' );
					$( '.pull-push-connection-info' ).attr( 'readonly', 'readonly' );
					$( '.connect-button' ).hide();

					$( '.connection-status' ).hide();
					$( '.step-two' ).show();
					connection_established = true;
					set_connection_data( data );
					move_connection_info_box();

					maybe_show_mixed_cased_table_name_warning();

					var loaded_tables = '';
					if ( false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables ) {
						loaded_tables = wpmdb_loaded_tables;
					}

					$pull_select = create_table_select( wpmdb.common.connection_data.tables, wpmdb.common.connection_data.table_sizes_hr, loaded_tables );

					var loaded_post_types = '';
					if ( false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_post_types ) {
						if ( 'undefined' !== typeof data.select_post_types ) {
							$( '#exclude-post-types' ).attr( 'checked', 'checked' );
							$( '.post-type-select-wrap' ).show();
							loaded_post_types = data.select_post_types;
						} else {
							loaded_post_types = wpmdb_loaded_post_types;
						}
					}

					var $post_type_select = document.createElement( 'select' );
					$( $post_type_select ).attr( {
						multiple: 'multiple',
						name: 'select_post_types[]',
						id: 'select-post-types',
						class: 'multiselect'
					} );

					$.each( wpmdb.common.connection_data.post_types, function( index, value ) {
						var selected = $.inArray( value, loaded_post_types );
						if ( -1 !== selected || ( true === wpmdb_convert_exclude_revisions && 'revision' !== value ) ) {
							selected = ' selected="selected" ';
						} else {
							selected = ' ';
						}
						$( $post_type_select ).append( '<option' + selected + 'value="' + value + '">' + value + '</option>' );
					} );

					$pull_post_type_select = $post_type_select;

					var loaded_tables_backup = '';
					if ( false === wpmdb_default_profile && 'undefined' !== typeof wpmdb_loaded_tables_backup ) {
						loaded_tables_backup = wpmdb_loaded_tables_backup;
					}

					var $table_select_backup = document.createElement( 'select' );
					$( $table_select_backup ).attr( {
						multiple: 'multiple',
						name: 'select_backup[]',
						id: 'select-backup',
						class: 'multiselect'
					} );

					$.each( wpmdb.common.connection_data.tables, function( index, value ) {
						var selected = $.inArray( value, loaded_tables_backup );
						if ( -1 !== selected ) {
							selected = ' selected="selected" ';
						} else {
							selected = ' ';
						}
						$( $table_select_backup ).append( '<option' + selected + 'value="' + value + '">' + value + ' (' + wpmdb.common.connection_data.table_sizes_hr[ value ] + ')</option>' );
					} );

					$push_select_backup = $table_select_backup;

					if ( 'pull' === wpmdb_migration_type() ) {
						$.wpmdb.do_action( 'wpmdb_update_pull_table_select' );
						$( '#select-post-types' ).remove();
						$( '.exclude-post-types-warning' ).after( $pull_post_type_select );
						$( '#select-backup' ).remove();
						$( '.backup-tables-wrap' ).prepend( $pull_select_backup );
						$( '.table-prefix' ).html( data.prefix );
						$( '.uploads-dir' ).html( wpmdb_data.this_uploads_dir );
					} else {
						$( '#select-backup' ).remove();
						$( '.backup-tables-wrap' ).prepend( $push_select_backup );
					}

					$.wpmdb.do_action( 'verify_connection_to_remote_site', wpmdb.common.connection_data );
				}

			} );

		}

		// automatically validate connection info if we're loading a saved profile
		establish_remote_connection_from_saved_profile();

		// add to <a> tags which act as JS event buttons, will not jump page to top and will deselect the button
		$( 'body' ).on( 'click', '.js-action-link', function( e ) {
			e.preventDefault();
			$( this ).blur();
		} );

		function enable_pro_licence( data, licence_key ) {
			$( '.licence-input, .register-licence' ).remove();
			$( '.licence-not-entered' ).prepend( data.masked_licence );
			$( '.support-content' ).empty().html( '<p>' + wpmdb_strings.fetching_license + '<img src="' + spinner_url + '" alt="" class="ajax-spinner general-spinner" /></p>' );
			check_licence( licence_key );

			$( '.migrate-selection label' ).removeClass( 'disabled' );
			$( '.migrate-selection input' ).removeAttr( 'disabled' );
		}

		$( '.licence-input' ).keypress( function( e ) {
			if ( 13 === e.which ) {
				e.preventDefault();
				$( '.register-licence' ).click();
			}
		} );

		// registers your licence
		$( 'body' ).on( 'click', '.register-licence', function( e ) {
			e.preventDefault();

			if ( doing_licence_registration_ajax ) {
				return;
			}

			var licence_key = $.trim( $( '.licence-input' ).val() );
			var $licence_status = $( '.licence-status' );

			$licence_status.removeClass( 'notification-message error-notice success-notice' );

			if ( '' === licence_key ) {
				$licence_status.html( '<div class="notification-message error-notice">' + wpmdb_strings.enter_license_key + '</div>' );
				return;
			}

			$licence_status.empty().removeClass( 'success' );
			doing_licence_registration_ajax = true;
			$( '.button.register-licence' ).after( '<img src="' + spinner_url + '" alt="" class="register-licence-ajax-spinner general-spinner" />' );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'JSON',
				cache: false,
				data: {
					action: 'wpmdb_activate_licence',
					licence_key: licence_key,
					nonce: wpmdb_data.nonces.activate_licence,
					context: 'licence'
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					doing_licence_registration_ajax = false;
					$( '.register-licence-ajax-spinner' ).remove();
					$licence_status.html( wpmdb_strings.register_license_problem );
				},
				success: function( data ) {
					doing_licence_registration_ajax = false;
					$( '.register-licence-ajax-spinner' ).remove();

					if ( 'undefined' !== typeof data.errors ) {
						var msg = '';
						for ( var key in data.errors ) {
							msg += data.errors[ key ];
						}
						$licence_status.html( msg );

						if ( 'undefined' !== typeof data.masked_licence ) {
							enable_pro_licence( data, licence_key );
							$( '.migrate-tab .invalid-licence' ).hide();
						}
					} else if ( 'undefined' !== typeof data.wpmdb_error && 'undefined' !== typeof data.body ) {
						$licence_status.html( data.body );
					} else {
						if ( 1 === Number( data.is_first_activation ) ) {
							wpmdb_strings.welcome_text = wpmdb_strings.welcome_text.replace( '%1$s', 'https://deliciousbrains.com/wp-migrate-db-pro/doc/quick-start-guide/' );
							wpmdb_strings.welcome_text = wpmdb_strings.welcome_text.replace( '%2$s', 'https://deliciousbrains.com/wp-migrate-db-pro/videos/' );

							$licence_status.after(
								'<div id="welcome-wrap">' +
									'<img id="welcome-img" src="' + wpmdb_data.this_plugin_url + 'asset/dist/img/welcome.jpg" />' +
									'<div class="welcome-text">' +
										'<h3>' + wpmdb_strings.welcome_title + '</h3>' +
										'<p>' + wpmdb_strings.welcome_text + '</p>' +
									'</div>' +
								'</div>'
							);
						}

						$licence_status.html( wpmdb_strings.license_registered ).delay( 5000 ).fadeOut( 1000, function() {
							$( this ).css( { visibility: 'hidden', display: 'block' } ).slideUp();
						} );
						$licence_status.addClass( 'success notification-message success-notice' );
						enable_pro_licence( data, licence_key );
						$( '.invalid-licence' ).hide();
					}
				}
			} );

		} );

		// clears the debug log
		$( '.clear-log' ).click( function() {
			$( '.debug-log-textarea' ).val( '' );
			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_clear_log',
					nonce: wpmdb_data.nonces.clear_log
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.clear_log_problem );
				},
				success: function( data ) {
				}
			} );
		} );

		// updates the debug log when the user switches to the help tab
		function refresh_debug_log() {
			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_get_log',
					nonce: wpmdb_data.nonces.get_log
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.update_log_problem );
				},
				success: function( data ) {
					$( '.debug-log-textarea' ).val( data );
				}
			} );
		}

		// select all tables
		$( '.multiselect-select-all' ).click( function() {
			var multiselect = $( this ).parents( '.select-wrap' ).children( '.multiselect' );
			$( 'option', multiselect ).prop( 'selected', 1 );
			$( multiselect ).focus().trigger( 'change' );
		} );

		// deselect all tables
		$( '.multiselect-deselect-all' ).click( function() {
			var multiselect = $( this ).parents( '.select-wrap' ).children( '.multiselect' );
			$( 'option', multiselect ).removeAttr( 'selected' );
			$( multiselect ).focus().trigger( 'change' );
		} );

		// invert table selection
		$( '.multiselect-invert-selection' ).click( function() {
			var multiselect = $( this ).parents( '.select-wrap' ).children( '.multiselect' );
			$( 'option', multiselect ).each( function() {
				$( this ).attr( 'selected', !$( this ).attr( 'selected' ) );
			} );
			$( multiselect ).focus().trigger( 'change' );
		} );

		// on option select hide all "advanced" option divs and show the correct div for the option selected
		$( '.option-group input[type=radio]' ).change( function() {
			var group = $( this ).closest( '.option-group' );
			$( 'ul', group ).hide();
			var parent = $( this ).closest( 'li' );
			$( 'ul', parent ).show();
		} );

		// on page load, expand hidden divs for selected options (browser form cache)
		$( '.option-group' ).each( function() {
			$( '.option-group input[type=radio]' ).each( function() {
				if ( $( this ).is( ':checked' ) ) {
					var parent = $( this ).closest( 'li' );
					$( 'ul', parent ).show();
				}
			} );
		} );

		// expand and collapse content on click
		$( '.header-expand-collapse' ).click( function() {
			if ( $( '.expand-collapse-arrow', this ).hasClass( 'collapsed' ) ) {
				$( '.expand-collapse-arrow', this ).removeClass( 'collapsed' );
				$( this ).next().show();
			} else {
				$( '.expand-collapse-arrow', this ).addClass( 'collapsed' );
				$( this ).next().hide();
			}
		} );

		$( '.checkbox-label input[type=checkbox]' ).change( function() {
			if ( $( this ).is( ':checked' ) ) {
				$( this ).parent().next().show();
			} else {
				$( this ).parent().next().hide();
			}
		} );

		// warning for excluding post types
		$( '.select-post-types-wrap' ).on( 'change', '#select-post-types', function() {
			exclude_post_types_warning();
		} );

		function exclude_post_types_warning() {
			var excluded_post_types = $( '#select-post-types' ).val();
			var excluded_post_types_text = '';
			var $exclude_post_types_warning = $( '.exclude-post-types-warning' );

			if ( excluded_post_types ) {
				excluded_post_types_text = '<code>' + excluded_post_types.join( '</code>, <code>' ) + '</code>';
				$( '.excluded-post-types' ).html( excluded_post_types_text );

				if ( '0' === $exclude_post_types_warning.css( 'opacity' ) ) {
					$exclude_post_types_warning
						.css( { opacity: 0 } )
						.slideDown( 200 )
						.animate( { opacity: 1 } );
				}
			} else {
				$exclude_post_types_warning
					.css( { opacity: 0 } )
					.slideUp( 200 )
					.animate( { opacity: 0 } );
			}
		}

		if ( $( '#exclude-post-types' ).is( ':checked' ) ) {
			if ( $( '#select-post-types' ).val() ) {
				$( '.exclude-post-types-warning' ).css( { display: 'block', opacity: 1 } );
			}
		}

		// special expand and collapse content on click for save migration profile
		$( '#save-migration-profile' ).change( function() {
			wpmdb.functions.update_migrate_button_text();
			if ( $( this ).is( ':checked' ) ) {
				$( '.save-settings-button' ).show();
			} else {
				$( '.save-settings-button' ).hide();
			}
		} );

		if ( $( '#save-migration-profile' ).is( ':checked' ) ) {
			$( '.save-settings-button' ).show();
		}

		$( '.create-new-profile' ).focus( function() {
			$( '#create_new' ).prop( 'checked', true );
		} );

		$( '.checkbox-label input[type=checkbox]' ).each( function() {
			if ( $( this ).is( ':checked' ) ) {
				$( this ).parent().next().show();
			}
		} );

		// AJAX migrate button
		$( '.migrate-db-button' ).click( function( event ) {
			$( this ).blur();
			event.preventDefault();
			wpmdb.migration_state_id = '';

			if ( false === $.wpmdb.apply_filters( 'wpmdb_migration_profile_ready', true ) ) {
				return;
			}

			// check that they've selected some tables to migrate
			if ( $( '#migrate-selected' ).is( ':checked' ) && null === $( '#select-tables' ).val() ) {
				alert( wpmdb_strings.please_select_one_table );
				return;
			}

			// check that they've selected some tables to backup
			if ( 'savefile' !== wpmdb_migration_type() && $( '#backup-manual-select' ).is( ':checked' ) && null === $( '#select-backup' ).val() ) {
				alert( wpmdb_strings.please_select_one_table_backup );
				return;
			}

			var new_url_missing = false;
			var new_file_path_missing = false;
			if ( $( '#new-url' ).length && !$( '#new-url' ).val() ) {
				$( '#new-url-missing-warning' ).show();
				$( '#new-url' ).focus();
				$( 'html,body' ).scrollTop( 0 );
				new_url_missing = true;
			}

			if ( $( '#new-path' ).length && !$( '#new-path' ).val() ) {
				$( '#new-path-missing-warning' ).show();
				if ( false === new_url_missing ) {
					$( '#new-path' ).focus();
					$( 'html,body' ).scrollTop( 0 );
				}
				new_file_path_missing = true;
			}

			if ( true === new_url_missing || true === new_file_path_missing ) {
				return;
			}

			// also save profile
			if ( $( '#save-migration-profile' ).is( ':checked' ) ) {
				save_active_profile();
			}

			form_data = $( $( '#migrate-form' )[0].elements ).not( '.auth-credentials' ).serialize();

			migration_intent = wpmdb_migration_type();

			stage = 'backup';

			if ( 'savefile' === migration_intent ) {
				stage = 'migrate';
			}

			if ( false === $( '#create-backup' ).is( ':checked' ) ) {
				stage = 'migrate';
			}

			wpmdb.current_migration = wpmdb.migration_progress_controller.newMigration( {
				'localTableSizes': wpmdb_data.this_table_sizes,
				'localTableRows': wpmdb_data.this_table_rows,
				'remoteTableSizes': 'undefined' !== typeof wpmdb.common.connection_data ? wpmdb.common.connection_data.table_sizes : null,
				'remoteTableRows': 'undefined' !== typeof wpmdb.common.connection_data ? wpmdb.common.connection_data.table_rows : null,
				'migrationIntent': wpmdb_migration_type()
			} );

			var backup_option = $( 'input[name=backup_option]:checked' ).val();
			var table_option = $( 'input[name=table_migrate_option]:checked' ).val();
			var selected_tables = '';
			var data_type = '';

			// set up backup stage
			if ( 'backup' === stage ) {
				if ( 'migrate_only_with_prefix' === table_option && 'backup_selected' === backup_option ) {
					backup_option = 'backup_only_with_prefix';
				}
				if ( 'push' === migration_intent ) {
					data_type = 'remote';
					if ( 'backup_only_with_prefix' === backup_option ) {
						tables_to_migrate = wpmdb.common.connection_data.prefixed_tables;
					} else if ( 'backup_selected' === backup_option ) {
						selected_tables = $( '#select-tables' ).val();
						selected_tables = $.wpmdb.apply_filters( 'wpmdb_backup_selected_tables', selected_tables );
						tables_to_migrate = get_intersect( selected_tables, wpmdb.common.connection_data.tables );
					} else if ( 'backup_manual_select' === backup_option ) {
						tables_to_migrate = $( '#select-backup' ).val();
					}
				} else {
					data_type = 'local';
					if ( 'backup_only_with_prefix' === backup_option ) {
						tables_to_migrate = wpmdb_data.this_prefixed_tables;
					} else if ( 'backup_selected' === backup_option ) {
						selected_tables = $( '#select-tables' ).val();
						selected_tables = $.wpmdb.apply_filters( 'wpmdb_backup_selected_tables', selected_tables );
						tables_to_migrate = get_intersect( selected_tables, wpmdb_data.this_tables );
					} else if ( 'backup_manual_select' === backup_option ) {
						tables_to_migrate = $( '#select-backup' ).val();
					}
				}

				wpmdb.current_migration.model.addStage( 'backup', tables_to_migrate, data_type, {
					strings: {
						migrated: wpmdb_strings.backed_up
					}
				} );
			}

			// set up migration stage
			if ( 'push' === migration_intent || 'savefile' === migration_intent ) {
				data_type = 'local';
			} else {
				data_type = 'remote';
			}
			wpmdb.current_migration.model.addStage( 'migrate', get_tables_to_migrate( null, null ), data_type );

			// add any additional migration stages via hook
			$.wpmdb.do_action( 'wpmdb_add_migration_stages', {
				'data_type': data_type,
				'tables_to_migrate': get_tables_to_migrate( null, null )
			} );

			var table_intent = $( 'input[name=table_migrate_option]:checked' ).val();
			var connection_info = $.trim( $( '.pull-push-connection-info' ).val() ).split( '\n' );
			var table_rows = '';

			remote_site = connection_info[ 0 ];
			secret_key = connection_info[ 1 ];

			var static_migration_label = '';

			completed_msg = wpmdb_strings.exporting_complete;

			if ( 'savefile' === migration_intent ) {
				static_migration_label = wpmdb_strings.exporting_please_wait;
			} else {
				static_migration_label = get_migration_status_label( remote_site, migration_intent, 'migrating' );
				completed_msg = get_migration_status_label( remote_site, migration_intent, 'completed' );
			}

			if ( 'backup' === stage ) {
				tables_to_migrate = wpmdb.current_migration.model.getStageItems( 'backup', 'name' );
			} else {
				tables_to_migrate = wpmdb.current_migration.model.getStageItems( 'migrate', 'name' );
			}

			wpmdb.current_migration.model.setActiveStage( stage );

			wpmdb.current_migration.setTitle( static_migration_label );

			wpmdb.current_migration.startTimer();

			currently_migrating = true;
			wpmdb.current_migration.setStatus( 'active' );

			var request_data = {
				action: 'wpmdb_initiate_migration',
				intent: migration_intent,
				url: remote_site,
				key: secret_key,
				form_data: form_data,
				stage: stage,
				nonce: wpmdb_data.nonces.initiate_migration
			};

			request_data.site_details = {
				local: wpmdb_data.site_details
			};

			if ( 'savefile' !== migration_intent ) {
				request_data.temp_prefix = wpmdb.common.connection_data.temp_prefix;
				request_data.site_details.remote = wpmdb.common.connection_data.site_details;
			}

			// site_details can have a very large number of elements that blows out PHP's max_input_vars
			// so we reduce it down to one variable for this one POST.
			request_data.site_details = JSON.stringify( request_data.site_details );

			doing_ajax = true;

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: request_data,
				error: function( jqXHR, textStatus, errorThrown ) {

					wpmdb.current_migration.setState( wpmdb_strings.migration_failed, get_ajax_errors( jqXHR.responseText, '(#112)', jqXHR ), 'error' );

					console.log( jqXHR );
					console.log( textStatus );
					console.log( errorThrown );
					doing_ajax = false;
					wpmdb.common.migration_error = true;
					wpmdb.functions.migration_complete_events();
					return;
				},
				success: function( data ) {
					doing_ajax = false;
					if ( 'undefined' !== typeof data && 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						wpmdb.current_migration.setState( wpmdb_strings.migration_failed, data.body, 'error' );

						return;
					}

					wpmdb.migration_state_id = data.migration_state_id;

					var i = 0;

					// Set delay between requests - use max of local/remote values, 0 if doing export
					delay_between_requests = 0;
					if ( 'savefile' !== migration_intent && 'undefined' !== typeof wpmdb.common.connection_data && 'undefined' !== typeof wpmdb.common.connection_data.delay_between_requests ) {
						delay_between_requests = Math.max( parseInt( wpmdb_data.delay_between_requests ), parseInt( wpmdb.common.connection_data.delay_between_requests ) );
					}

					wpmdb.functions.migrate_table_recursive = function( current_row, primary_keys ) {

						if ( i >= tables_to_migrate.length ) {
							if ( 'backup' === stage ) {
								wpmdb.current_migration.model.setActiveStage( 'migrate' );

								stage = 'migrate';
								i = 0;

								// should get from model
								tables_to_migrate = get_tables_to_migrate( null, null );

							} else {
								$( '.progress-label' ).removeClass( 'label-visible' );

								wpmdb.common.hooks = $.wpmdb.apply_filters( 'wpmdb_before_migration_complete_hooks', wpmdb.common.hooks );
								wpmdb.common.hooks.push( wpmdb.functions.migration_complete );
								wpmdb.common.hooks.push( wpmdb.functions.wpmdb_flush );
								wpmdb.common.hooks = $.wpmdb.apply_filters( 'wpmdb_after_migration_complete_hooks', wpmdb.common.hooks );
								wpmdb.common.hooks.push( wpmdb.functions.migration_complete_events );
								wpmdb.common.next_step_in_migration = { fn: wpmdb_call_next_hook };
								wpmdb.functions.execute_next_step();
								return;
							}
						}

						var last_table = 0;
						if ( i === ( tables_to_migrate.length - 1 ) ) {
							last_table = 1;
						}

						var gzip = 0;
						if ( 'savefile' !== migration_intent && 1 === parseInt( wpmdb.common.connection_data.gzip ) ) {
							gzip = 1;
						}

						var request_data = {
							action: 'wpmdb_migrate_table',
							migration_state_id: wpmdb.migration_state_id,
							table: tables_to_migrate[ i ],
							stage: stage,
							current_row: current_row,
							last_table: last_table,
							primary_keys: primary_keys,
							gzip: gzip,
							nonce: wpmdb_data.nonces.migrate_table
						};

						if ( 'savefile' !== migration_intent ) {
							request_data.bottleneck = wpmdb.common.connection_data.bottleneck;
							request_data.prefix = wpmdb.common.connection_data.prefix;
						}

						if ( wpmdb.common.connection_data && wpmdb.common.connection_data.path_current_site && wpmdb.common.connection_data.domain ) {
							request_data.path_current_site = wpmdb.common.connection_data.path_current_site;
							request_data.domain_current_site = wpmdb.common.connection_data.domain;
						}

						doing_ajax = true;

						$.ajax( {
							url: ajaxurl,
							type: 'POST',
							dataType: 'text',
							cache: false,
							timeout: 0,
							data: request_data,
							error: function( jqXHR, textStatus, errorThrown ) {
								var progress_text = wpmdb_strings.table_process_problem + ' ' + tables_to_migrate[ i ] + '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText;
								wpmdb.current_migration.setState( wpmdb_strings.migration_failed, progress_text, 'error' );

								doing_ajax = false;
								console.log( jqXHR );
								console.log( textStatus );
								console.log( errorThrown );
								wpmdb.common.migration_error = true;
								wpmdb.functions.migration_complete_events();
								return;
							},
							success: function( data ) {
								doing_ajax = false;
								data = $.trim( data );
								var row_information = wpmdb_parse_json( data );
								var error_text = '';

								if ( false === row_information || null === row_information ) {

									// should update model
									if ( '' === data || null === data ) {
										error_text = wpmdb_strings.table_process_problem_empty_response + ' ' + tables_to_migrate[ i ];
									} else {
										error_text = get_ajax_errors( data, null, null );
									}

									wpmdb.current_migration.setState( wpmdb_strings.migration_failed, error_text, 'error' );
									wpmdb.common.migration_error = true;
									wpmdb.functions.migration_complete_events();
									return;
								}

								if ( 'undefined' !== typeof row_information.wpmdb_error && 1 === row_information.wpmdb_error ) {
									wpmdb.current_migration.setState( wpmdb_strings.migration_failed, row_information.body, 'error' );
									wpmdb.common.migration_error = true;
									wpmdb.functions.migration_complete_events();
									return;
								}

								//successful iteration, update model
								wpmdb.current_migration.setText();
								wpmdb.current_migration.model.getStageModel( stage ).setItemRowsTransferred( tables_to_migrate[ i ], row_information.current_row );

								// We need the returned file name for delivery or display to the user.
								if ( 1 === last_table && 'savefile' === migration_intent ) {
									if ( 'undefined' !== typeof row_information.dump_filename ) {
										dump_filename = row_information.dump_filename;
									}
									if ( 'undefined' !== typeof row_information.dump_path ) {
										dump_path = row_information.dump_path;
									}
								}

								if ( -1 === parseInt( row_information.current_row ) ) {
									i++;
									row_information.current_row = '';
									row_information.primary_keys = '';
								}

								wpmdb.common.next_step_in_migration = {
									fn: wpmdb.functions.migrate_table_recursive,
									args: [ row_information.current_row, row_information.primary_keys ]
								};
								wpmdb.functions.execute_next_step();
							}
						} );

					};

					wpmdb.common.next_step_in_migration = {
						fn: wpmdb.functions.migrate_table_recursive,
						args: [ '-1', '' ]
					};
					wpmdb.functions.execute_next_step();

				}

			} ); // end ajax

		} );

		wpmdb.functions.migration_complete_events = function() {
			if ( false === wpmdb.common.migration_error ) {
				if ( '' === wpmdb.common.non_fatal_errors ) {
					if ( 'savefile' !== migration_intent && true === $( '#save_computer' ).is( ':checked' ) ) {
						wpmdb.current_migration.setText();
					}

					if ( true === migration_cancelled ) {
						wpmdb.current_migration.setState( completed_msg + '&nbsp;<div class="dashicons dashicons-yes"></div>', wpmdb_strings.migration_cancelled_success, 'cancelled' );
					} else {
						wpmdb.current_migration.setState( completed_msg + '&nbsp;<div class="dashicons dashicons-yes"></div>', '', 'complete' );
					}

				} else {
					wpmdb.current_migration.setState( wpmdb_strings.completed_with_some_errors, wpmdb.common.non_fatal_errors, 'error' );
				}
			}

			$( '.migration-controls' ).addClass( 'hidden' );

			// reset migration variables so consecutive migrations work correctly
			wpmdb.common.hooks = [];
			wpmdb.common.call_stack = [];
			wpmdb.common.migration_error = false;
			currently_migrating = false;
			migration_completed = true;
			migration_paused = false;
			migration_cancelled = false;
			doing_ajax = false;
			wpmdb.common.non_fatal_errors = '';

			$( '.progress-label' ).remove();
			$( '.migration-progress-ajax-spinner' ).remove();
			$( '.close-progress-content' ).show();
			$( '#overlay' ).css( 'cursor', 'pointer' );
			wpmdb.current_migration.model.setMigrationComplete();
		};

		wpmdb.functions.migration_complete = function() {

			$( '.migration-controls' ).addClass( 'hidden' );

			if ( 'savefile' === migration_intent ) {
				currently_migrating = false;
				var migrate_complete_text = wpmdb_strings.migration_complete;
				if ( $( '#save_computer' ).is( ':checked' ) ) {
					var url = wpmdb_data.this_download_url + encodeURIComponent( dump_filename );
					if ( $( '#gzip_file' ).is( ':checked' ) ) {
						url += '&gzip=1';
					}
					window.location = url;
				} else {
					migrate_complete_text = wpmdb_strings.completed_dump_located_at + ' ' + dump_path;
				}

				if ( false === wpmdb.common.migration_error ) {

					wpmdb.functions.migration_complete_events();
					wpmdb.current_migration.setState( completed_msg, migrate_complete_text, 'complete' );

				}

			} else { // rename temp tables, delete old tables

				wpmdb.current_migration.setState( null, wpmdb_strings.finalizing_migration, 'finalizing' );

				doing_ajax = true;
				$.ajax( {
					url: ajaxurl,
					type: 'POST',
					dataType: 'text',
					cache: false,
					data: {
						action: 'wpmdb_finalize_migration',
						migration_state_id: wpmdb.migration_state_id,
						prefix: wpmdb.common.connection_data.prefix,
						tables: tables_to_migrate.join( ',' ),
						nonce: wpmdb_data.nonces.finalize_migration
					},
					error: function( jqXHR, textStatus, errorThrown ) {
						doing_ajax = false;
						wpmdb.current_migration.setState( wpmdb_strings.migration_failed, wpmdb_strings.finalize_tables_problem, 'error' );

						alert( jqXHR + ' : ' + textStatus + ' : ' + errorThrown );
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					},
					success: function( data ) {
						doing_ajax = false;
						if ( '1' !== $.trim( data ) ) {
							wpmdb.current_migration.setState( wpmdb_strings.migration_failed, data, 'error' );

							wpmdb.common.migration_error = true;
							wpmdb.functions.migration_complete_events();
							return;
						}
						wpmdb.common.next_step_in_migration = { fn: wpmdb_call_next_hook };
						wpmdb.functions.execute_next_step();
					}
				} );
			}
		};

		wpmdb.functions.wpmdb_flush = function() {
			if ( 'savefile' !== migration_intent ) {
				wpmdb.current_migration.setText( wpmdb_strings.flushing );
				doing_ajax = true;
				$.ajax( {
					url: ajaxurl,
					type: 'POST',
					dataType: 'text',
					cache: false,
					data: {
						action: 'wpmdb_flush',
						migration_state_id: wpmdb.migration_state_id,
						nonce: wpmdb_data.nonces.flush
					},
					error: function( jqXHR, textStatus, errorThrown ) {
						doing_ajax = false;
						wpmdb.current_migration.setState( wpmdb_strings.migration_failed, wpmdb_strings.flush_problem, 'error' );

						alert( jqXHR + ' : ' + textStatus + ' : ' + errorThrown );
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					},
					success: function( data ) {
						doing_ajax = false;
						if ( '1' !== $.trim( data ) ) {
							wpmdb.current_migration.setState( wpmdb_strings.migration_failed, data, 'error' );

							wpmdb.common.migration_error = true;
							wpmdb.functions.migration_complete_events();
							return;
						}
						wpmdb.common.next_step_in_migration = { fn: wpmdb_call_next_hook };
						wpmdb.functions.execute_next_step();
					}
				} );
			}
		};

		wpmdb.functions.update_migrate_button_text = function() {
			var migration_intent = wpmdb_migration_type();
			var save_string = ( $( '#save-migration-profile' ).is( ':checked' ) ) ? '_save' : '';
			var migrate_string = 'migrate_button_' + ( ( 'savefile' === migration_intent ) ? 'export' : migration_intent ) + save_string;
			$( '.migrate-db .button-primary' ).val( wpmdb_strings[ migrate_string ] );
		};

		wpmdb.functions.update_migrate_button_text();

		// close progress pop up once migration is completed
		$( 'body' ).on( 'click', '.close-progress-content-button', function( e ) {
			hide_overlay();
			wpmdb.current_migration.restoreTitleElem();
		} );

		$( 'body' ).on( 'click', '#overlay', function( e ) {
			if ( true === migration_completed && e.target === this ) {
				hide_overlay();
				wpmdb.current_migration.restoreTitleElem();
			}
		} );

		function hide_overlay() {
			$( '#overlay' ).removeClass( 'show' ).addClass( 'hide' );
			$( '#overlay > div' ).removeClass( 'show' ).addClass( 'hide' );
			wpmdb.current_migration.$proVersion.find( 'iframe' ).remove();
			setTimeout( function() {
				$( '#overlay' ).remove();
			}, 500 );
			migration_completed = false;
		}

		// AJAX save button profile
		$( '.save-settings-button' ).click( function( event ) {
			event.preventDefault();
			if ( '' === $.trim( $( '.create-new-profile' ).val() ) && $( '#create_new' ).is( ':checked' ) ) {
				alert( wpmdb_strings.enter_name_for_profile );
				$( '.create-new-profile' ).focus();
				return;
			}
			save_active_profile();
		} );

		function save_active_profile() {
			var profile;
			$( '.save-settings-button' ).blur();

			if ( doing_save_profile ) {
				return;
			}

			// check that they've selected some tables to migrate
			if ( $( '#migrate-selected' ).is( ':checked' ) && null === $( '#select-tables' ).val() ) {
				alert( wpmdb_strings.please_select_one_table );
				return;
			}

			// check that they've selected some tables to backup
			if ( 'savefile' !== wpmdb_migration_type() && $( '#backup-manual-select' ).is( ':checked' ) && null === $( '#select-backup' ).val() ) {
				alert( wpmdb_strings.please_select_one_table_backup );
				return;
			}

			var create_new_profile = false;

			if ( $( '#create_new' ).is( ':checked' ) ) {
				create_new_profile = true;
			}
			var profile_name = $( '.create-new-profile' ).val();

			doing_save_profile = true;
			profile = $( $( '#migrate-form' )[0].elements ).not( '.auth-credentials' ).serialize();

			$( '.save-settings-button' ).attr( 'disabled', 'disabled' )
				.after( '<img src="' + spinner_url + '" alt="" class="save-profile-ajax-spinner general-spinner" />' );

			doing_ajax = true;

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_save_profile',
					profile: profile,
					nonce: wpmdb_data.nonces.save_profile
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					doing_ajax = false;
					alert( wpmdb_strings.save_profile_problem );
					$( '.save-settings-button' ).removeAttr( 'disabled' );
					$( '.save-profile-ajax-spinner' ).remove();
					$( '.save-settings-button' ).after( '<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>' );
					$( '.ajax-success-msg' ).fadeOut( 2000, function() {
						$( this ).remove();
					} );
					doing_save_profile = false;
				},
				success: function( data ) {
					var updated_profile_id = parseInt( $( '#migrate-form input[name=save_migration_profile_option]:checked' ).val(), 10 ) + 1;
					doing_ajax = false;
					$( '.save-settings-button' ).removeAttr( 'disabled' );
					$( '.save-profile-ajax-spinner' ).remove();
					$( '.save-settings-button' ).after( '<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>' );
					$( '.ajax-success-msg' ).fadeOut( 2000, function() {
						$( this ).remove();
					} );
					doing_save_profile = false;
					$( '.create-new-profile' ).val( '' );

					if ( create_new_profile ) {
						var new_profile_key = parseInt( data, 10 );
						var new_profile_id = new_profile_key + 1;
						var new_li = $( '<li><span class="delete-profile" data-profile-id="' + new_profile_id + '"></span><label for="profile-' + new_profile_id + '"><input id="profile-' + new_profile_id + '" value="' + new_profile_key + '" name="save_migration_profile_option" type="radio"></label></li>' );
						new_li.find( 'label' ).append( document.createTextNode( ' ' + profile_name ) );
						updated_profile_id = new_profile_id;

						$( '#create_new' ).parents( 'li' ).before( new_li );
						$( '#profile-' + new_profile_id ).attr( 'checked', 'checked' );
					}

					// Push updated profile id to history if available
					var updated_url = window.location.href.replace( '#migrate', '' ).replace( /&wpmdb-profile=-?\d+/, '' ) + '&wpmdb-profile=' + updated_profile_id;
					var updated_profile_name = $( '#migrate-form input[name=save_migration_profile_option]:checked' ).parent().text().trim();

					if ( 'function' === typeof window.history.pushState ) {
						if ( $( '#migrate-form .crumbs' ).length ) {
							$( '#migrate-form .crumbs .crumb:last' ).text( updated_profile_name );
						} else {
							var $crumbs = $( '<div class="crumbs" />' )
								.append( '<a class="crumb" href="' + wpmdb_data.this_plugin_base + '"> Saved Profiles </a>' )
								.append( '<span class="crumb">' + updated_profile_name + '</span>' );
							$( '#migrate-form' ).prepend( $crumbs );
						}
						window.history.pushState( { updated_profile_id: updated_profile_id }, null, updated_url );
					}
				}
			} );
		}

		// save file (export) / push / pull special conditions
		function move_connection_info_box() {
			$( '.connection-status' ).hide();
			$( '.prefix-notice' ).hide();
			$( '.ssl-notice' ).hide();
			$( '.different-plugin-version-notice' ).hide();
			$( '.step-two' ).show();
			$( '.backup-options' ).show();
			$( '.keep-active-plugins' ).show();
			$( '.directory-permission-notice' ).hide();
			$( '#create-backup' ).removeAttr( 'disabled' );
			$( '#create-backup-label' ).removeClass( 'disabled' );
			$( '.backup-option-disabled' ).hide();
			$( '.compatibility-older-mysql' ).hide();
			var connection_info = $.trim( $( '.pull-push-connection-info' ).val() ).split( '\n' );
			var profile_name;
			wpmdb_toggle_migration_action_text();
			if ( 'pull' === wpmdb_migration_type() ) {
				$( '.pull-list li' ).append( $connection_info_box );
				$connection_info_box.show( function() {
					var connection_textarea = $( this ).find( '.pull-push-connection-info' );
					if ( !connection_textarea.val() ) {
						connection_textarea.focus();
					}
				} );
				if ( connection_established ) {
					$( '.connection-status' ).hide();
					$( '.step-two' ).show();
					$( '.table-prefix' ).html( wpmdb.common.connection_data.prefix );
					$( '.uploads-dir' ).html( wpmdb_data.this_uploads_dir );
					if ( false === profile_name_edited ) {
						profile_name = get_domain_name( wpmdb.common.connection_data.url );
						$( '.create-new-profile' ).val( profile_name );
					}
					if ( true === show_prefix_notice ) {
						$( '.prefix-notice.pull' ).show();
					}
					if ( true === show_ssl_notice ) {
						$( '.ssl-notice' ).show();
					}
					if ( true === show_version_notice ) {
						$( '.different-plugin-version-notice' ).show();
						$( '.step-two' ).hide();
					}
					wpmdb_toggle_migration_action_text();
					if ( false === wpmdb_data.write_permission ) {
						$( '#create-backup' ).prop( 'checked', false );
						$( '#create-backup' ).attr( 'disabled', 'disabled' );
						$( '#create-backup-label' ).addClass( 'disabled' );
						$( '.backup-option-disabled' ).show();
						$( '.upload-directory-location' ).html( wpmdb_data.this_upload_dir_long );
					}
				} else {
					$( '.connection-status' ).show();
					$( '.step-two' ).hide();
				}
			} else if ( 'push' === wpmdb_migration_type() ) {
				$( '.push-list li' ).append( $connection_info_box );
				$connection_info_box.show( function() {
					var connection_textarea = $( this ).find( '.pull-push-connection-info' );
					if ( !connection_textarea.val() ) {
						connection_textarea.focus();
					}
				} );
				if ( connection_established ) {
					$( '.connection-status' ).hide();
					$( '.step-two' ).show();
					$( '.table-prefix' ).html( wpmdb_data.this_prefix );
					$( '.uploads-dir' ).html( wpmdb.common.connection_data.uploads_dir );
					if ( false === profile_name_edited ) {
						profile_name = get_domain_name( wpmdb.common.connection_data.url );
						$( '.create-new-profile' ).val( profile_name );
					}
					if ( true === show_prefix_notice ) {
						$( '.prefix-notice.push' ).show();
					}
					if ( true === show_ssl_notice ) {
						$( '.ssl-notice' ).show();
					}
					if ( true === show_version_notice ) {
						$( '.different-plugin-version-notice' ).show();
						$( '.step-two' ).hide();
					}
					wpmdb_toggle_migration_action_text();
					if ( '0' === wpmdb.common.connection_data.write_permissions ) {
						$( '#create-backup' ).prop( 'checked', false );
						$( '#create-backup' ).attr( 'disabled', 'disabled' );
						$( '#create-backup-label' ).addClass( 'disabled' );
						$( '.backup-option-disabled' ).show();
						$( '.upload-directory-location' ).html( wpmdb.common.connection_data.upload_dir_long );
					}
				} else {
					$( '.connection-status' ).show();
					$( '.step-two' ).hide();
				}
			} else if ( 'savefile' === wpmdb_migration_type() ) {
				$( '.connection-status' ).hide();
				$( '.step-two' ).show();
				$( '.table-prefix' ).html( wpmdb_data.this_prefix );
				$( '.compatibility-older-mysql' ).show();
				if ( false === profile_name_edited ) {
					$( '.create-new-profile' ).val( '' );
				}
				$( '.backup-options' ).hide();
				$( '.keep-active-plugins' ).hide();
				if ( false === wpmdb_data.write_permission ) {
					$( '.directory-permission-notice' ).show();
					$( '.step-two' ).hide();
				}
			}
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action( 'move_connection_info_box', {
				'migration_type': wpmdb_migration_type(),
				'last_migration_type': last_replace_switch
			} );
		}

		// move around textarea depending on whether or not the push/pull options are selected
		var $connection_info_box = $( '.connection-info-wrapper' );
		move_connection_info_box();

		$( '.migrate-selection.option-group input[type=radio]' ).change( function() {
			move_connection_info_box();
			if ( connection_established ) {
				change_replace_values();
			}
			wpmdb.functions.update_migrate_button_text();
		} );

		function change_replace_values() {
			var old_url = null;
			var old_path = null;
			if ( null !== wpmdb.common.previous_connection_data && 'object' === typeof wpmdb.common.previous_connection_data && wpmdb.common.previous_connection_data.url !== wpmdb.common.connection_data.url ) {
				old_url = remove_protocol( wpmdb.common.previous_connection_data.url );
				old_path = wpmdb.common.previous_connection_data.path;
			}

			if ( 'push' === wpmdb_migration_type() || 'savefile' === wpmdb_migration_type() ) {
				if ( 'pull' === last_replace_switch ) {
					$( '.replace-row' ).each( function() {
						var old_val = $( '.old-replace-col input', this ).val();
						$( '.old-replace-col input', this ).val( $( '.replace-right-col input', this ).val() );
						$( '.replace-right-col input', this ).val( old_val );
					} );
				} else if ( 'push' === last_replace_switch && 'push' === wpmdb_migration_type() && null !== old_url && null !== old_path ) {
					$( '.replace-row' ).each( function() {
						var old_val = $( '.replace-right-col input', this ).val();
						if ( old_val === old_path ) {
							$( '.replace-right-col input', this ).val( wpmdb.common.connection_data.path );
						}
						if ( old_val === old_url ) {
							$( '.replace-right-col input', this ).val( remove_protocol( wpmdb.common.connection_data.url ) );
						}
					} );
				}
				$.wpmdb.do_action( 'wpmdb_update_push_table_select' );
				$( '#select-post-types' ).remove();
				$( '.exclude-post-types-warning' ).after( $push_post_type_select );
				exclude_post_types_warning();
				$( '#select-backup' ).remove();
				$( '.backup-tables-wrap' ).prepend( $push_select_backup );
			} else if ( 'pull' === wpmdb_migration_type() ) {
				if ( '' === last_replace_switch || 'push' === last_replace_switch || 'savefile' === last_replace_switch ) {
					$( '.replace-row' ).each( function() {
						var old_val = $( '.old-replace-col input', this ).val();
						$( '.old-replace-col input', this ).val( $( '.replace-right-col input', this ).val() );
						$( '.replace-right-col input', this ).val( old_val );
					} );
				} else if ( 'pull' === last_replace_switch && 'pull' === wpmdb_migration_type() && null !== old_url && null !== old_path ) {
					$( '.replace-row' ).each( function() {
						var old_val = $( '.old-replace-col input', this ).val();
						if ( old_val === old_path ) {
							$( '.old-replace-col input', this ).val( wpmdb.common.connection_data.path );
						}
						if ( old_val === old_url ) {
							$( '.old-replace-col input', this ).val( remove_protocol( wpmdb.common.connection_data.url ) );
						}
					} );
				}
				$.wpmdb.do_action( 'wpmdb_update_pull_table_select' );
				$( '#select-post-types' ).remove();
				$( '.exclude-post-types-warning' ).after( $pull_post_type_select );
				exclude_post_types_warning();
				$( '#select-backup' ).remove();
				$( '.backup-tables-wrap' ).prepend( $pull_select_backup );
			}
			last_replace_switch = wpmdb_migration_type();
		}

		// hide second section if pull or push is selected with no connection established
		if ( ( 'pull' === wpmdb_migration_type() || 'push' === wpmdb_migration_type() ) && !connection_established ) {
			$( '.step-two' ).hide();
			$( '.connection-status' ).show();
		}

		// show / hide GUID helper description
		$( '.general-helper' ).click( function( e ) {
			e.preventDefault();
			var icon = $( this ),
				bubble = $( this ).next();

			// Close any that are already open
			$( '.helper-message' ).not( bubble ).hide();

			var position = icon.position();
			if ( bubble.hasClass( 'bottom' ) ) {
				bubble.css( {
					'left': ( position.left - bubble.width() / 2 ) + 'px',
					'top': ( position.top + icon.height() + 9 ) + 'px'
				} );
			} else {
				bubble.css( {
					'left': ( position.left + icon.width() + 9 ) + 'px',
					'top': ( position.top + icon.height() / 2 - 18 ) + 'px'
				} );
			}

			bubble.toggle();
			e.stopPropagation();
		} );

		$( 'body' ).click( function() {
			$( '.helper-message' ).hide();
		} );

		$( '.helper-message' ).click( function( e ) {
			e.stopPropagation();
		} );

		$( 'body' ).on( 'click', '.show-errors-toggle', function( e ) {
			e.preventDefault();
			$( this ).next( '.migration-php-errors' ).toggle();
		} );

		/**
		 * Core plugin wrapper for the common AJAX error detecting method
		 *
		 * @param text
		 * @param code
		 * @param jqXHR
		 *
		 * @returns {string}
		 */
		function get_ajax_errors( text, code, jqXHR ) {
			return wpmdbGetAjaxErrors( wpmdb_strings.connection_local_server_problem, code, text, jqXHR );
		}

		// migrate / settings tabs
		$( '.nav-tab' ).click( function() {
			var hash = $( this ).attr( 'data-div-name' );
			hash = hash.replace( '-tab', '' );
			window.location.hash = hash;
			switch_to_plugin_tab( hash, false );
		} );

		$( 'body' ).on( 'click', 'a[href^="#"]', function( event ) {
			var href = $( event.target ).attr( 'href' );
			var tab_name = href.substr( 1 );

			if ( tab_name ) {
				var nav_tab = $( '.' + tab_name );
				if ( 1 === nav_tab.length ) {
					nav_tab.trigger( 'click' );
					event.preventDefault();
				}
			}
		} );

		// repeatable fields
		$( 'body' ).on( 'click', '.add-row', function() {
			var $parent_tr = $( this ).parents( 'tr' );
			$parent_tr.before( $( '.original-repeatable-field' ).clone().removeClass( 'original-repeatable-field' ) );
			$parent_tr.prev().find( '.old-replace-col input' ).focus();
		} );

		// repeatable fields
		$( 'body' ).on( 'click', '.replace-remove-row', function() {
			$( this ).parents( 'tr' ).remove();
			if ( 2 >= $( '.replace-row' ).length ) {
				$( '.no-replaces-message' ).show();
			}

			var prev_id = $( this ).prev().attr( 'id' );
			if ( 'new-url' === prev_id || 'new-path' === prev_id ) {
				$( '#' + prev_id + '-missing-warning' ).hide();
			}
		} );

		// Hide New URL & New Path Warnings on change.
		$( 'body' )
			.on( 'change', '#new-url', function() {
				$( '#new-url-missing-warning' ).hide();
			} )
			.on( 'change', '#new-path', function() {
				$( '#new-path-missing-warning' ).hide();
			} );

		// Copy Find field to associated Replace field on arrow click.
		$( 'body' ).on( 'click', '.arrow-col', function() {
			var replace_row_arrow = this;

			if ( $( replace_row_arrow ).hasClass( 'disabled' ) ) {
				return;
			}

			var original_value = $( replace_row_arrow ).prev( 'td' ).find( 'input' ).val();
			var new_value_input = $( replace_row_arrow ).next( 'td' ).find( 'input' );
			new_value_input.val( original_value );

			// Hide New URL or New Path Warning if changed.
			if ( 'new-url' === new_value_input.prop( 'id' ) ) {
				$( '#new-url-missing-warning' ).hide();
			} else if ( 'new-path' === new_value_input.prop( 'id' ) ) {
				$( '#new-path-missing-warning' ).hide();
			}
		} );

		$( '.add-replace' ).click( function() {
			$( '.replace-fields' ).prepend( $( '.original-repeatable-field' ).clone().removeClass( 'original-repeatable-field' ) );
			$( '.no-replaces-message' ).hide();
		} );

		$( '#find-and-replace-sort tbody' ).sortable( {
			items: '> tr:not(.pin)',
			handle: 'td:first',
			start: function() {
				$( '.sort-handle' ).css( 'cursor', '-webkit-grabbing' );
				$( '.sort-handle' ).css( 'cursor', '-moz-grabbing' );
			},
			stop: function() {
				$( '.sort-handle' ).css( 'cursor', '-webkit-grab' );
				$( '.sort-handle' ).css( 'cursor', '-moz-grab' );
			}
		} );

		function validate_url( url ) {
			return /^([a-z]([a-z]|\d|\+|-|\.)*):(\/\/(((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:)*@)?((\[(|(v[\da-f]{1,}\.(([a-z]|\d|-|\.|_|~)|[!\$&'\(\)\*\+,;=]|:)+))\])|((\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5])\.(\d|[1-9]\d|1\d\d|2[0-4]\d|25[0-5]))|(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=])*)(:\d*)?)(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*|(\/((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)?)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)+(\/(([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)*)*)|((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)){0})(\?((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|[\uE000-\uF8FF]|\/|\?)*)?(\#((([a-z]|\d|-|\.|_|~|[\u00A0-\uD7FF\uF900-\uFDCF\uFDF0-\uFFEF])|(%[\da-f]{2})|[!\$&'\(\)\*\+,;=]|:|@)|\/|\?)*)?$/i.test( url );
		}

		function switch_to_plugin_tab( hash, skip_addons_check ) {
			$( '.nav-tab' ).removeClass( 'nav-tab-active' );
			$( '.nav-tab.' + hash ).addClass( 'nav-tab-active' );
			$( '.content-tab' ).hide();
			$( '.' + hash + '-tab' ).show();

			if ( 'settings' === hash ) {
				if ( true === should_check_licence() ) {
					$( 'p.licence-status' ).append( 'Checking License... ' ).append( ajax_spinner );
					check_licence();
				}
			}

			if ( 'help' === hash ) {
				refresh_debug_log();
				if ( true === should_check_licence() ) {
					$( '.support-content p' ).append( ajax_spinner );
					check_licence();
				}
			}

			if ( 'addons' === hash && true !== skip_addons_check ) {
				if ( true === should_check_licence() ) {
					$( '.addons-content p' ).append( ajax_spinner );
					check_licence();
				}
			}
		}

		function should_check_licence() {
			if ( false === checked_licence && '1' === wpmdb_data.has_licence && 'true' === wpmdb_data.is_pro ) {
				return true;
			}
			return false;
		}

		var hash = '';

		// check for hash in url (settings || migrate) switch tabs accordingly
		if ( window.location.hash ) {
			hash = window.location.hash.substring( 1 );
			switch_to_plugin_tab( hash, false );
		}

		if ( '' !== get_query_var( 'install-plugin' ) ) {
			hash = 'addons';
			checked_licence = true;
			switch_to_plugin_tab( hash, true );
		}

		// process notice links clicks, eg. dismiss, reminder
		$( '.notice-link' ).click( function( e ) {
			e.preventDefault();
			$( this ).closest( '.inline-message' ).hide();
			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_process_notice_link',
					nonce: wpmdb_data.nonces.process_notice_link,
					notice: $( this ).data( 'notice' ),
					type: $( this ).data( 'type' ),
					reminder: $( this ).data( 'reminder' )
				}
			} );
		} );

		// regenerates the saved secret key
		$( '.reset-api-key' ).click( function() {
			var answer = confirm( wpmdb_strings.reset_api_key );

			if ( !answer || doing_reset_api_key_ajax ) {
				return;
			}

			doing_reset_api_key_ajax = true;
			$( '.reset-api-key' ).after( '<img src="' + spinner_url + '" alt="" class="reset-api-key-ajax-spinner general-spinner" />' );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_reset_api_key',
					nonce: wpmdb_data.nonces.reset_api_key
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.reset_api_key_problem );
					$( '.reset-api-key-ajax-spinner' ).remove();
					doing_reset_api_key_ajax = false;
				},
				success: function( data ) {
					$( '.reset-api-key-ajax-spinner' ).remove();
					doing_reset_api_key_ajax = false;
					$( '.connection-info' ).html( data );
					wpmdb_data.connection_info = $.trim( data ).split( '\n' );
				}
			} );

		} );

		// show / hide table select box when specific settings change
		$( 'input.multiselect-toggle' ).change( function() {
			$( this ).parents( '.expandable-content' ).children( '.select-wrap' ).toggle();
		} );

		$( '.show-multiselect' ).each( function() {
			if ( $( this ).is( ':checked' ) ) {
				$( this ).parents( '.option-section' ).children( '.header-expand-collapse' ).children( '.expand-collapse-arrow' ).removeClass( 'collapsed' );
				$( this ).parents( '.expandable-content' ).show();
				$( this ).parents( '.expandable-content' ).children( '.select-wrap' ).toggle();
			}
		} );

		$( 'input[name=backup_option]' ).change( function() {
			$( '.backup-tables-wrap' ).hide();
			if ( 'backup_manual_select' === $( this ).val() ) {
				$( '.backup-tables-wrap' ).show();
			}
		} );

		if ( $( '#backup-manual-select' ).is( ':checked' ) ) {
			$( '.backup-tables-wrap' ).show();
		}

		$( '.plugin-compatibility-save' ).click( function() {
			if ( doing_plugin_compatibility_ajax ) {
				return;
			}
			$( this ).addClass( 'disabled' );
			var select_element = $( '#selected-plugins' );
			$( select_element ).attr( 'disabled', 'disabled' );

			$( '.plugin-compatibility-success-msg' ).remove();

			doing_plugin_compatibility_ajax = true;
			$( this ).after( '<img src="' + spinner_url + '" alt="" class="plugin-compatibility-spinner general-spinner" />' );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_blacklist_plugins',
					blacklist_plugins: $( select_element ).val()
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.blacklist_problem + '\r\n\r\n' + wpmdb_strings.status + ' ' + jqXHR.status + ' ' + jqXHR.statusText + '\r\n\r\n' + wpmdb_strings.response + '\r\n' + jqXHR.responseText );
					$( select_element ).removeAttr( 'disabled' );
					$( '.plugin-compatibility-save' ).removeClass( 'disabled' );
					doing_plugin_compatibility_ajax = false;
					$( '.plugin-compatibility-spinner' ).remove();
				},
				success: function( data ) {
					if ( '' !== $.trim( data ) ) {
						alert( data );
					}
					$( select_element ).removeAttr( 'disabled' );
					$( '.plugin-compatibility-save' ).removeClass( 'disabled' );
					doing_plugin_compatibility_ajax = false;
					$( '.plugin-compatibility-spinner' ).remove();
					$( '.plugin-compatibility-save' ).after( '<span class="plugin-compatibility-success-msg">' + wpmdb_strings.saved + '</span>' );
					$( '.plugin-compatibility-success-msg' ).fadeOut( 2000 );
				}
			} );
		} );

		// delete a profile from the migrate form area
		$( 'body' ).on( 'click', '.delete-profile', function() {
			var name = $( this ).next().clone();
			$( 'input', name ).remove();
			name = $.trim( $( name ).html() );
			var answer = confirm( wpmdb_strings.remove_profile.replace( '{{profile}}', name ) );

			if ( !answer ) {
				return;
			}
			var $profile_li = $( this ).parent();

			if ( $profile_li.find( 'input:checked' ).length ) {
				var $new_profile_li = $profile_li.siblings().last();
				$new_profile_li.find( 'input[type=radio]' ).prop( 'checked', 'checked' );
				$new_profile_li.find( 'input[type=text]' ).focus();
				$( '#migrate-form .crumbs .crumb:last' ).text( 'New Profile' );

				if ( 'function' === typeof window.history.pushState ) {
					var updated_url = window.location.href.replace( '#migrate', '' ).replace( /&wpmdb-profile=-?\d+/, '' ) + '&wpmdb-profile=-1';
					window.history.pushState( { updated_profile_id: -1 }, null, updated_url );
				}
			}

			$profile_li.fadeOut( 500 );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_delete_migration_profile',
					profile_id: $( this ).attr( 'data-profile-id' ),
					nonce: wpmdb_data.nonces.delete_migration_profile
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.remove_profile_problem );
				},
				success: function( data ) {
					if ( '-1' === data ) {
						alert( wpmdb_strings.remove_profile_not_found );
					}
				}
			} );

		} );

		// deletes a profile from the main profile selection screen
		$( '.main-list-delete-profile-link' ).click( function() {
			var name = $( this ).prev().html();
			var answer = confirm( wpmdb_strings.remove_profile.replace( '{{profile}}', name ) );

			if ( !answer ) {
				return;
			}

			$( this ).parent().fadeOut( 500 );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_delete_migration_profile',
					profile_id: $( this ).attr( 'data-profile-id' ),
					nonce: wpmdb_data.nonces.delete_migration_profile
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.remove_profile_problem );
				}
			} );

		} );

		// warn the user when editing the connection info after a connection has been established
		$( 'body' ).on( 'click', '.temp-disabled', function() {
			var answer = confirm( wpmdb_strings.change_connection_info );

			if ( !answer ) {
				return;
			} else {
				$( '.ssl-notice' ).hide();
				$( '.different-plugin-version-notice' ).hide();
				$( '.migrate-db-button' ).show();
				$( '.temp-disabled' ).removeAttr( 'readonly' );
				$( '.temp-disabled' ).removeClass( 'temp-disabled' );
				$( '.connect-button' ).show();
				$( '.step-two' ).hide();
				$( '.connection-status' ).show().html( wpmdb_strings.enter_connection_info );
				connection_established = false;
			}
		} );

		// ajax request for settings page when checking/unchecking setting radio buttons
		$( '.settings-tab input[type=checkbox]' ).change( function() {
			if ( 'plugin-compatibility' === $( this ).attr( 'id' ) ) {
				return;
			}
			var checked = $( this ).is( ':checked' );
			var setting = $( this ).attr( 'id' );
			var $status = $( this ).closest( 'td' ).next( 'td' ).find( '.setting-status' );

			$( '.ajax-success-msg' ).remove();
			$status.after( ajax_spinner );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'text',
				cache: false,
				data: {
					action: 'wpmdb_save_setting',
					checked: checked,
					setting: setting,
					nonce: wpmdb_data.nonces.save_setting
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					alert( wpmdb_strings.save_settings_problem );
					$( '.ajax-spinner' ).remove();
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					$status.append( '<span class="ajax-success-msg">' + wpmdb_strings.saved + '</span>' );
					$( '.ajax-success-msg' ).fadeOut( 2000, function() {
						$( this ).remove();
					} );
				}
			} );

		} );

		// disable form submissions
		$( '.migrate-form' ).submit( function( e ) {
			e.preventDefault();
		} );

		// fire connection_box_changed when the connect button is pressed
		$( '.connect-button' ).click( function( event ) {
			event.preventDefault();
			$( this ).blur();
			connection_box_changed();
		} );

		// send paste even to connection_box_changed() function
		$( '.pull-push-connection-info' ).bind( 'paste', function( e ) {
			var $this = this;
			setTimeout( function() {
				connection_box_changed();
			}, 0 );

		} );

		$( 'body' ).on( 'click', '.try-again', function() {
			connection_box_changed();
		} );

		$( 'body' ).on( 'click', '.try-http', function() {
			var connection_info = $.trim( $( '.pull-push-connection-info' ).val() ).split( '\n' );
			var new_url = connection_info[ 0 ].replace( 'https', 'http' );
			var new_contents = new_url + '\n' + connection_info[ 1 ];
			$( '.pull-push-connection-info' ).val( new_contents );
			connection_box_changed();
		} );

		$( '.create-new-profile' ).change( function() {
			profile_name_edited = true;
		} );

		$( 'body' ).on( 'click', '.temporarily-disable-ssl', function() {
			var hash = '';
			if ( window.location.hash ) {
				hash = window.location.hash.substring( 1 );
			}
			$( this ).attr( 'href', $( this ).attr( 'href' ) + '&hash=' + hash );
		} );

		// fired when the connection info box changes (e.g. gets pasted into)
		function connection_box_changed( data ) {
			var $this = $( '.pull-push-connection-info' );

			if ( doing_ajax || $( $this ).hasClass( 'temp-disabled' ) ) {
				return;
			}

			data = $( '.pull-push-connection-info' ).val();

			var connection_info = $.trim( data ).split( '\n' );
			var error = false;
			var error_message = '';

			if ( '' === connection_info ) {
				error = true;
				error_message = wpmdb_strings.connection_info_missing;
			}

			if ( 2 !== connection_info.length && !error ) {
				error = true;
				error_message = wpmdb_strings.connection_info_incorrect;
			}

			if ( !error && !validate_url( connection_info[ 0 ] ) ) {
				error = true;
				error_message = wpmdb_strings.connection_info_url_invalid;
			}

			if ( !error && 32 >= connection_info[ 1 ].length ) {
				error = true;
				error_message = wpmdb_strings.connection_info_key_invalid;
			}

			if ( !error && connection_info[ 0 ] === wpmdb_data.connection_info[ 0 ] ) {
				error = true;
				error_message = wpmdb_strings.connection_info_local_url;
			}

			if ( !error && connection_info[ 1 ] === wpmdb_data.connection_info[ 1 ] ) {
				error = true;
				error_message = wpmdb_strings.connection_info_local_key;
			}

			if ( error ) {
				$( '.connection-status' ).html( error_message );
				$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );
				return;
			}

			var new_connection_info_contents = connection_info[ 0 ] + '\n' + connection_info[ 1 ];

			if ( false === wpmdb_data.openssl_available ) {
				connection_info[ 0 ] = connection_info[ 0 ].replace( 'https://', 'http://' );
				new_connection_info_contents = connection_info[ 0 ] + '\n' + connection_info[ 1 ];
				$( '.pull-push-connection-info' ).val( new_connection_info_contents );
			}

			show_prefix_notice = false;
			doing_ajax = true;
			disable_export_type_controls();

			if ( $( '.basic-access-auth-wrapper' ).is( ':visible' ) ) {
				connection_info[ 0 ] = connection_info[ 0 ].replace( /\/\/(.*)@/, '//' );
				connection_info[ 0 ] = connection_info[ 0 ].replace( '//', '//' + encodeURIComponent( $.trim( $( '.auth-username' ).val() ) ) + ':' + encodeURIComponent( $.trim( $( '.auth-password' ).val() ) ) + '@' );
				new_connection_info_contents = connection_info[ 0 ] + '\n' + connection_info[ 1 ];
				$( '.pull-push-connection-info' ).val( new_connection_info_contents );
				$( '.basic-access-auth-wrapper' ).hide();
			}

			$( '.step-two' ).hide();
			$( '.ssl-notice' ).hide();
			$( '.prefix-notice' ).hide();
			$( '.connection-status' ).show();

			$( '.connection-status' ).html( wpmdb_strings.establishing_remote_connection );
			$( '.connection-status' ).removeClass( 'notification-message error-notice migration-error' );
			$( '.connection-status' ).append( ajax_spinner );

			var intent = wpmdb_migration_type();

			profile_name_edited = false;

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_verify_connection_to_remote_site',
					url: connection_info[ 0 ],
					key: connection_info[ 1 ],
					intent: intent,
					nonce: wpmdb_data.nonces.verify_connection_to_remote_site
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					$( '.connection-status' ).html( get_ajax_errors( jqXHR.responseText, '(#100)', jqXHR ) );
					$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();
					maybe_show_ssl_warning( connection_info[ 0 ], connection_info[ 1 ], data.scheme );

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						$( '.connection-status' ).html( data.body );
						$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );

						if ( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$( '.basic-access-auth-wrapper' ).show();
						}

						return;
					}

					var profile_name = get_domain_name( data.url );
					$( '.create-new-profile' ).val( profile_name );

					$( '.pull-push-connection-info' ).addClass( 'temp-disabled' );
					$( '.pull-push-connection-info' ).attr( 'readonly', 'readonly' );
					$( '.connect-button' ).hide();

					$( '.connection-status' ).hide();
					$( '.step-two' ).show();

					maybe_show_prefix_notice( data.prefix );

					connection_established = true;
					set_connection_data( data );
					move_connection_info_box();
					change_replace_values();

					maybe_show_mixed_cased_table_name_warning();

					refresh_table_selects();

					$push_select_backup = $( $pull_select ).clone();
					$( $push_select_backup ).attr( {
						name: 'select_backup[]',
						id: 'select-backup'
					} );

					var $post_type_select = document.createElement( 'select' );
					$( $post_type_select ).attr( {
						multiple: 'multiple',
						name: 'select_post_types[]',
						id: 'select-post-types',
						class: 'multiselect'
					} );

					$.each( wpmdb.common.connection_data.post_types, function( index, value ) {
						$( $post_type_select ).append( '<option value="' + value + '">' + value + '</option>' );
					} );

					$pull_post_type_select = $post_type_select;

					$( '#new-path-missing-warning, #new-url-missing-warning' ).hide();

					if ( 'pull' === wpmdb_migration_type() ) {
						$( '#new-url' ).val( remove_protocol( wpmdb_data.this_url ) );
						$( '#new-path' ).val( wpmdb_data.this_path );
						if ( 'true' === wpmdb_data.is_multisite ) {
							$( '#new-domain' ).val( wpmdb_data.this_domain );
							$( '.replace-row.pin .old-replace-col input[type="text"]' ).val( remove_protocol( data.url ) );
						}
						$( '#old-url' ).val( remove_protocol( data.url ) );
						$( '#old-path' ).val( data.path );
						$.wpmdb.do_action( 'wpmdb_update_pull_table_select' );
						$( '#select-post-types' ).remove();
						$( '.exclude-post-types-warning' ).after( $pull_post_type_select );
						exclude_post_types_warning();
						$( '.table-prefix' ).html( data.prefix );
						$( '.uploads-dir' ).html( wpmdb_data.this_uploads_dir );
					} else {
						$( '#new-url' ).val( remove_protocol( data.url ) );
						$( '#new-path' ).val( data.path );
						if ( 'true' === wpmdb_data.is_multisite ) {
							$( '.replace-row.pin .old-replace-col input[type="text"]' ).val( remove_protocol( wpmdb_data.this_url ) );
						}
						$.wpmdb.do_action( 'wpmdb_update_push_table_select' );
						$( '#select-backup' ).remove();
						$( '.backup-tables-wrap' ).prepend( $push_select_backup );
					}

					wpmdb.common.next_step_in_migration = {
						fn: $.wpmdb.do_action,
						args: [ 'verify_connection_to_remote_site', wpmdb.common.connection_data ]
					};
					wpmdb.functions.execute_next_step();
				}

			} );

		}

		// Sets the initial Pause/Resume button event to Pause
		$( 'body' ).on( 'click', '.pause-resume', function( event ) {
			set_pause_resume_button( event );
		} );

		function cancel_migration( event ) {
			migration_cancelled = true;
			$( '.migration-controls' ).css( { visibility: 'hidden' } );

			wpmdb.current_migration.setState( wpmdb_strings.cancelling_migration, wpmdb_strings.completing_current_request, 'cancelling' );

			if ( true === migration_paused ) {
				migration_paused = false;
				wpmdb.functions.execute_next_step();
			}
		}

		$( 'body' ).on( 'click', '.cancel', function( event ) {
			cancel_migration( event );
		} );

		$( '.enter-licence' ).click( function() {
			$( '.settings' ).click();
			$( '.licence-input' ).focus();
		} );

		wpmdb.functions.execute_next_step = function() {

			// if delay is set, set a timeout for delay to recall this function, then return
			if ( 0 < delay_between_requests && false === flag_skip_delay ) {
				setTimeout( function() {
					flag_skip_delay = true;
					wpmdb.functions.execute_next_step();
				}, delay_between_requests );
				return;
			} else {
				flag_skip_delay = false;
			}

			if ( true === migration_paused ) {
				$( '.migration-progress-ajax-spinner' ).hide();

				// Pause the timer
				wpmdb.current_migration.pauseTimer();

				var pause_text = '';
				if ( true === is_auto_pause_before_finalize ) {
					pause_text = wpmdb_strings.paused_before_finalize;
					is_auto_pause_before_finalize = false;
				} else {
					pause_text = wpmdb_strings.paused;
				}

				wpmdb.current_migration.setState( null, pause_text, 'paused' );

				// Re-bind Pause/Resume button to Resume when we are finally Paused
				$( 'body' ).on( 'click', '.pause-resume', function( event ) {
					set_pause_resume_button( event );
				} );
				$( 'body' ).on( 'click', '.cancel', function( event ) {
					cancel_migration( event );
				} );
				$( '.pause-resume' ).html( wpmdb_strings.resume );
				return;
			} else if ( true === migration_cancelled ) {
				migration_intent = wpmdb_migration_type();

				var progress_msg;

				if ( 'savefile' === migration_intent ) {
					progress_msg = wpmdb_strings.removing_local_sql;
				} else if ( 'pull' === migration_intent ) {
					if ( 'backup' === stage ) {
						progress_msg = wpmdb_strings.removing_local_backup;
					} else {
						progress_msg = wpmdb_strings.removing_local_temp_tables;
					}
				} else if ( 'push' === migration_intent ) {
					if ( 'backup' === stage ) {
						progress_msg = wpmdb_strings.removing_remote_sql;
					} else {
						progress_msg = wpmdb_strings.removing_remote_temp_tables;
					}
				}
				wpmdb.current_migration.setText( progress_msg );

				var request_data = {
					action: 'wpmdb_cancel_migration',
					migration_state_id: wpmdb.migration_state_id
				};

				doing_ajax = true;

				$.ajax( {
					url: ajaxurl,
					type: 'POST',
					dataType: 'text',
					cache: false,
					data: request_data,
					error: function( jqXHR, textStatus, errorThrown ) {
						wpmdb.current_migration.setState( wpmdb_strings.migration_cancellation_failed, wpmdb_strings.manually_remove_temp_files + '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + ':<br />' + jqXHR.responseText, 'error' );
						console.log( jqXHR );
						console.log( textStatus );
						console.log( errorThrown );
						doing_ajax = false;
						wpmdb.common.migration_error = true;
						wpmdb.functions.migration_complete_events();
						return;
					},
					success: function( data ) {
						doing_ajax = false;
						data = $.trim( data );
						if ( ( 'push' === migration_intent && '1' !== data ) || ( 'push' !== migration_intent && '' !== data ) ) {
							wpmdb.current_migration.setState( wpmdb_strings.migration_cancellation_failed, data, 'error' );
							wpmdb.common.migration_error = true;
							wpmdb.functions.migration_complete_events();
							return;
						}
						completed_msg = wpmdb_strings.migration_cancelled;
						wpmdb.functions.migration_complete_events();
						wpmdb.current_migration.setStatus( 'cancelled' );
					}
				} );
			} else {
				wpmdb.common.next_step_in_migration.fn.apply( null, wpmdb.common.next_step_in_migration.args );
			}
		};

		$( 'body' ).on( 'click', '.copy-licence-to-remote-site', function() {
			$( '.connection-status' ).html( wpmdb_strings.copying_license );
			$( '.connection-status' ).removeClass( 'notification-message error-notice migration-error' );
			$( '.connection-status' ).append( ajax_spinner );

			var connection_info = $.trim( $( '.pull-push-connection-info' ).val() ).split( '\n' );

			doing_ajax = true;
			disable_export_type_controls();

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_copy_licence_to_remote_site',
					url: connection_info[ 0 ],
					key: connection_info[ 1 ],
					nonce: wpmdb_data.nonces.copy_licence_to_remote_site
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					$( '.connection-status' ).html( get_ajax_errors( jqXHR.responseText, '(#143)', jqXHR ) );
					$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
					enable_export_type_controls();

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						$( '.connection-status' ).html( data.body );
						$( '.connection-status' ).addClass( 'notification-message error-notice migration-error' );

						if ( data.body.indexOf( '401 Unauthorized' ) > -1 ) {
							$( '.basic-access-auth-wrapper' ).show();
						}

						return;
					}
					connection_box_changed();
				}
			} );
		} );

		$( 'body' ).on( 'click', '.reactivate-licence', function( e ) {
			doing_ajax = true;

			$( '.invalid-licence' ).empty().html( wpmdb_strings.attempting_to_activate_licence );
			$( '.invalid-licence' ).append( ajax_spinner );

			$.ajax( {
				url: ajaxurl,
				type: 'POST',
				dataType: 'json',
				cache: false,
				data: {
					action: 'wpmdb_reactivate_licence',
					nonce: wpmdb_data.nonces.reactivate_licence
				},
				error: function( jqXHR, textStatus, errorThrown ) {
					$( '.invalid-licence' ).html( wpmdb_strings.activate_licence_problem );
					$( '.invalid-licence' ).append( '<br /><br />' + wpmdb_strings.status + ': ' + jqXHR.status + ' ' + jqXHR.statusText + '<br /><br />' + wpmdb_strings.response + '<br />' + jqXHR.responseText );
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;
				},
				success: function( data ) {
					$( '.ajax-spinner' ).remove();
					doing_ajax = false;

					if ( 'undefined' !== typeof data.wpmdb_error && 1 === data.wpmdb_error ) {
						$( '.invalid-licence' ).html( data.body );
						return;
					}

					if ( 'undefined' !== typeof data.wpmdb_dbrains_api_down && 1 === data.wpmdb_dbrains_api_down ) {
						$( '.invalid-licence' ).html( wpmdb_strings.temporarily_activated_licence );
						$( '.invalid-licence' ).append( data.body );
						return;
					}

					$( '.invalid-licence' ).empty().html( wpmdb_strings.licence_reactivated );
					location.reload();
				}
			} );

		} );

		$( 'input[name=table_migrate_option]' ).change( function() {
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action( 'wpmdb_tables_to_migrate_changed' );
		} );

		$( 'body' ).on( 'change', '#select-tables', function() {
			maybe_show_mixed_cased_table_name_warning();
			$.wpmdb.do_action( 'wpmdb_tables_to_migrate_changed' );
		} );

		$.wpmdb.add_filter( 'wpmdb_get_table_prefix', get_table_prefix );
		$.wpmdb.add_filter( 'wpmdb_get_tables_to_migrate', get_tables_to_migrate );
		$.wpmdb.add_action( 'wpmdb_lock_replace_url', lock_replace_url );

		$.wpmdb.add_filter( 'wpmdb_before_migration_complete_hooks', function( hooks ) {
			pause_before_finalize = $( 'input[name=pause_before_finalize]:checked' ).length ? true : false;
			if ( true === pause_before_finalize && 'savefile' !== migration_intent ) {
				set_pause_resume_button( null ); // don't just set migration_paused to true, since `set_pause_resume_button` will get double bound to clicking resume
				is_auto_pause_before_finalize = true;
			}
			return hooks;
		} );

		/**
		 * Set checkbox
		 *
		 * @param string checkbox_wrap
		 */
		function set_checkbox( checkbox_wrap ) {
			var $switch = $( '#' + checkbox_wrap );
			var $checkbox = $switch.find( 'input[type=checkbox]' );

			$switch.toggleClass( 'on' ).find( 'span' ).toggleClass( 'checked' );
			var switch_on = $switch.find( 'span.on' ).hasClass( 'checked' );
			$checkbox.attr( 'checked', switch_on ).trigger( 'change' );
		}

		$( '.wpmdb-switch' ).on( 'click', function( e ) {
			if ( ! $( this ).hasClass( 'disabled' ) ) {
				set_checkbox( $( this ).attr( 'id' ) );
			}
		} );

	} );

})( jQuery, wpmdb );

},{"MigrationProgress-controller":1}]},{},[1,2,3,4,5,6,7])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvd3AtbWlncmF0ZS1kYi1wcm8vYXNzZXQvc3JjL2pzL21vZHVsZXMvTWlncmF0aW9uUHJvZ3Jlc3MtY29udHJvbGxlci5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy1tb2RlbC5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy11dGlscy5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy12aWV3LmpzIiwic3JjL3dwLW1pZ3JhdGUtZGItcHJvL2Fzc2V0L3NyYy9qcy9tb2R1bGVzL01pZ3JhdGlvblByb2dyZXNzU3RhZ2UtbW9kZWwuanMiLCJzcmMvd3AtbWlncmF0ZS1kYi1wcm8vYXNzZXQvc3JjL2pzL21vZHVsZXMvTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZS12aWV3LmpzIiwic3JjL3dwLW1pZ3JhdGUtZGItcHJvL2Fzc2V0L3NyYy9qcy9zY3JpcHQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdNQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4SEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM5SkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeFFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyICQgPSBqUXVlcnk7XG52YXIgTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbCA9IHJlcXVpcmUoICdNaWdyYXRpb25Qcm9ncmVzcy1tb2RlbCcgKTtcbnZhciBNaWdyYXRpb25Qcm9ncmVzc1ZpZXcgPSByZXF1aXJlKCAnTWlncmF0aW9uUHJvZ3Jlc3MtdmlldycgKTtcbnZhciAkb3ZlcmxheU9yaWdpbmFsID0gJCggJzxkaXYgaWQ9XCJvdmVybGF5XCIgY2xhc3M9XCJoaWRlXCI+PC9kaXY+JyApO1xudmFyICRwcm9ncmVzc0NvbnRlbnRPcmlnaW5hbCA9ICQoICcucHJvZ3Jlc3MtY29udGVudCcgKS5jbG9uZSgpLmFkZENsYXNzKCAnaGlkZScgKTtcbnZhciAkcHJvVmVyc2lvbiA9ICQoICcucHJvLXZlcnNpb24nICkuYWRkQ2xhc3MoICdoaWRlJyApO1xuXG4kb3ZlcmxheU9yaWdpbmFsLmFwcGVuZCggJHByb1ZlcnNpb24gKTtcblxudmFyIE1pZ3JhdGlvblByb2dyZXNzQ29udHJvbGxlciA9IHtcblx0bWlncmF0aW9uOiB7XG5cdFx0bW9kZWw6IHt9LFxuXHRcdHZpZXc6IHt9LFxuXHRcdCRwcm9ncmVzczoge30sXG5cdFx0JHdyYXBwZXI6IHt9LFxuXHRcdCRvdmVybGF5OiB7fSxcblx0XHRzdGF0dXM6ICdhY3RpdmUnLFxuXHRcdHRpdGxlOiAnJyxcblx0XHR0ZXh0OiAnJyxcblx0XHR0aW1lckNvdW50OiAwLFxuXHRcdGVsYXBzZWRJbnRlcnZhbDogMCxcblx0XHRjdXJyZW50U3RhZ2VOdW06IDAsXG5cdFx0Y291bnRlckRpc3BsYXk6IGZhbHNlLFxuXHRcdG9yaWdpbmFsVGl0bGU6IGRvY3VtZW50LnRpdGxlLFxuXHRcdHNldFRpdGxlOiBmdW5jdGlvbiggdGl0bGUgKSB7XG5cdFx0XHR0aGlzLiRwcm9ncmVzcy5maW5kKCAnLnByb2dyZXNzLXRpdGxlJyApLmh0bWwoIHRpdGxlICk7XG5cdFx0XHR0aGlzLnRpdGxlID0gdGl0bGU7XG5cdFx0fSxcblx0XHRzZXRTdGF0dXM6IGZ1bmN0aW9uKCBzdGF0dXMgKSB7XG5cdFx0XHR0aGlzLiRwcm9ncmVzc1xuXHRcdFx0XHQucmVtb3ZlQ2xhc3MoIHRoaXMuc3RhdHVzIClcblx0XHRcdFx0LmFkZENsYXNzKCAoICdlcnJvcicgPT09IHN0YXR1cyApID8gJ3dwbWRiLWVycm9yJyA6IHN0YXR1cyApO1xuXG5cdFx0XHQvLyBQb3NzaWJsZSBzdGF0dXNlcyBpbmNsdWRlOiAnZXJyb3InLCAncGF1c2VkJywgJ2NvbXBsZXRlJywgJ2NhbmNlbGxpbmcnXG5cdFx0XHRpZiAoICdlcnJvcicgPT09IHN0YXR1cyApIHtcblx0XHRcdFx0dGhpcy4kcHJvZ3Jlc3MuZmluZCggJy5wcm9ncmVzcy10ZXh0JyApLmFkZENsYXNzKCAnbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXR1cyA9IHN0YXR1cztcblxuXHRcdFx0dGhpcy51cGRhdGVUaXRsZUVsZW0oKTtcblx0XHR9LFxuXHRcdHNldFRleHQ6IGZ1bmN0aW9uKCB0ZXh0ICkge1xuXHRcdFx0aWYgKCAnc3RyaW5nJyAhPT0gdHlwZW9mIHRleHQgKSB7XG5cdFx0XHRcdHRleHQgPSAnJztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAwID49IHRleHQuaW5kZXhPZiggJ3dwbWRiX2Vycm9yJyApICkge1xuXHRcdFx0XHR0ZXh0ID0gdGhpcy5kZWNvZGVFcnJvck9iamVjdCggdGV4dCApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRwcm9ncmVzcy5maW5kKCAnLnByb2dyZXNzLXRleHQnICkuaHRtbCggdGV4dCApO1xuXHRcdFx0dGhpcy50ZXh0ID0gdGV4dDtcblx0XHR9LFxuXHRcdHNldFN0YXRlOiBmdW5jdGlvbiggdGl0bGUsIHRleHQsIHN0YXR1cyApIHtcblx0XHRcdGlmICggbnVsbCAhPT0gdGl0bGUgKSB7XG5cdFx0XHRcdHRoaXMuc2V0VGl0bGUoIHRpdGxlICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG51bGwgIT09IHRleHQgKSB7XG5cdFx0XHRcdHRoaXMuc2V0VGV4dCggdGV4dCApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBudWxsICE9PSBzdGF0dXMgKSB7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdHVzKCBzdGF0dXMgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHN0YXJ0VGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy50aW1lckNvdW50ID0gMDtcblx0XHRcdHRoaXMuY291bnRlckRpc3BsYXkgPSAkKCAnLnRpbWVyJyApO1xuXHRcdFx0dGhpcy5lbGFwc2VkSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggdGhpcy5pbmNyZW1lbnRUaW1lciwgMTAwMCApO1xuXHRcdH0sXG5cdFx0cGF1c2VUaW1lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhckludGVydmFsKCB0aGlzLmVsYXBzZWRJbnRlcnZhbCApO1xuXHRcdH0sXG5cdFx0cmVzdW1lVGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5lbGFwc2VkSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggdGhpcy5pbmNyZW1lbnRUaW1lciwgMTAwMCApO1xuXHRcdH0sXG5cdFx0aW5jcmVtZW50VGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24udGltZXJDb3VudCA9IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnRpbWVyQ291bnQgKyAxO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uZGlzcGxheUNvdW50KCk7XG5cdFx0fSxcblx0XHRkaXNwbGF5Q291bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhvdXJzID0gTWF0aC5mbG9vciggdGhpcy50aW1lckNvdW50IC8gMzYwMCApICUgMjQ7XG5cdFx0XHR2YXIgbWludXRlcyA9IE1hdGguZmxvb3IoIHRoaXMudGltZXJDb3VudCAvIDYwICkgJSA2MDtcblx0XHRcdHZhciBzZWNvbmRzID0gdGhpcy50aW1lckNvdW50ICUgNjA7XG5cdFx0XHR2YXIgZGlzcGxheSA9IHRoaXMucGFkKCBob3VycywgMiwgMCApICsgJzonICsgdGhpcy5wYWQoIG1pbnV0ZXMsIDIsIDAgKSArICc6JyArIHRoaXMucGFkKCBzZWNvbmRzLCAyLCAwICk7XG5cdFx0XHR0aGlzLmNvdW50ZXJEaXNwbGF5Lmh0bWwoIGRpc3BsYXkgKTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpdGxlRWxlbTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYWN0aXZlU3RhZ2UgPSB0aGlzLm1vZGVsLmdldCggJ2FjdGl2ZVN0YWdlTmFtZScgKTtcblx0XHRcdHZhciBzdGFnZU1vZGVsID0gdGhpcy5tb2RlbC5nZXRTdGFnZU1vZGVsKCBhY3RpdmVTdGFnZSApO1xuXHRcdFx0dmFyIHBlcmNlbnREb25lID0gTWF0aC5tYXgoIDAsIHN0YWdlTW9kZWwuZ2V0VG90YWxQcm9ncmVzc1BlcmNlbnQoKSApO1xuXHRcdFx0dmFyIG51bVN0YWdlcyA9IHRoaXMubW9kZWwuZ2V0KCAnc3RhZ2VzJyApLmxlbmd0aDtcblx0XHRcdHZhciBjdXJyZW50U3RhZ2UgPSB0aGlzLmN1cnJlbnRTdGFnZU51bTtcblx0XHRcdHZhciBjdXJyZW50U3RhdHVzID0gdGhpcy5zdGF0dXM7XG5cdFx0XHR2YXIgcHJvZ3Jlc3NUZXh0ID0gd3BtZGJfc3RyaW5ncy50aXRsZV9wcm9ncmVzcztcblxuXHRcdFx0aWYgKCAnY29tcGxldGUnID09PSBzdGFnZU1vZGVsLmdldCggJ3N0YXR1cycgKSAmJiAwID09PSBzdGFnZU1vZGVsLmdldCggJ3RvdGFsU2l6ZScgKSApIHtcblx0XHRcdFx0cGVyY2VudERvbmUgPSAxMDA7XG5cdFx0XHR9XG5cblx0XHRcdHByb2dyZXNzVGV4dCA9IHByb2dyZXNzVGV4dC5yZXBsYWNlKCAnJTEkcycsIHBlcmNlbnREb25lICsgJyUnICk7XG5cdFx0XHRwcm9ncmVzc1RleHQgPSBwcm9ncmVzc1RleHQucmVwbGFjZSggJyUyJHMnLCBjdXJyZW50U3RhZ2UgKTtcblx0XHRcdHByb2dyZXNzVGV4dCA9IHByb2dyZXNzVGV4dC5yZXBsYWNlKCAnJTMkcycsIG51bVN0YWdlcyApO1xuXG5cdFx0XHRpZiAoIDEgPT09IG51bVN0YWdlcyApIHtcblx0XHRcdFx0cHJvZ3Jlc3NUZXh0ID0gcGVyY2VudERvbmUgKyAnJSc7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggd3BtZGJfc3RyaW5nc1sgJ3RpdGxlXycgKyBjdXJyZW50U3RhdHVzIF0gKSB7XG5cdFx0XHRcdHByb2dyZXNzVGV4dCA9IHdwbWRiX3N0cmluZ3NbICd0aXRsZV8nICsgY3VycmVudFN0YXR1cyBdO1xuXHRcdFx0fVxuXG5cdFx0XHRwcm9ncmVzc1RleHQgPSBwcm9ncmVzc1RleHQgKyAnIC0gJyArIHRoaXMub3JpZ2luYWxUaXRsZTtcblxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSBwcm9ncmVzc1RleHQ7XG5cdFx0fSxcblx0XHRyZXN0b3JlVGl0bGVFbGVtOiBmdW5jdGlvbigpIHtcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGhpcy5vcmlnaW5hbFRpdGxlO1xuXHRcdH0sXG5cdFx0cGFkOiBmdW5jdGlvbiggbnVtLCB3aWR0aCwgcGFkQ2hhciApIHtcblx0XHRcdHBhZENoYXIgPSBwYWRDaGFyIHx8ICcwJztcblx0XHRcdG51bSA9IG51bSArICcnO1xuXHRcdFx0cmV0dXJuIG51bS5sZW5ndGggPj0gd2lkdGggPyBudW0gOiBuZXcgQXJyYXkoIHdpZHRoIC0gbnVtLmxlbmd0aCArIDEgKS5qb2luKCBwYWRDaGFyICkgKyBudW07XG5cdFx0fSxcblxuXHRcdC8vIGZpeGVzIGVycm9yIG9iamVjdHMgdGhhdCBoYXZlIGJlZW4gbWFuZ2xlZCBieSBodG1sIGVuY29kaW5nXG5cdFx0ZGVjb2RlRXJyb3JPYmplY3Q6IGZ1bmN0aW9uKCBpbnB1dCApIHtcblx0XHRcdHZhciBpbnB1dERlY29kZWQgPSBpbnB1dFxuXHRcdFx0XHQucmVwbGFjZSggL1xceyZxdW90Oy9nLCAneyNxISMnIClcblx0XHRcdFx0LnJlcGxhY2UoIC9cXCZxdW90O30vZywgJyNxISN9JyApXG5cdFx0XHRcdC5yZXBsYWNlKCAvLCZxdW90Oy9nLCAnLCNxISMnIClcblx0XHRcdFx0LnJlcGxhY2UoIC8mcXVvdDs6L2csICcjcSEjOicgKVxuXHRcdFx0XHQucmVwbGFjZSggLzomcXVvdDsvZywgJzojcSEjJyApXG5cdFx0XHRcdC5yZXBsYWNlKCAvJnF1b3Q7L2csICdcXFxcXCInIClcblx0XHRcdFx0LnJlcGxhY2UoIC8jcSEjL2csICdcIicgKVxuXHRcdFx0XHQucmVwbGFjZSggLyZndDsvZywgJz4nIClcblx0XHRcdFx0LnJlcGxhY2UoIC8mbHQ7L2csICc8JyApO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aW5wdXREZWNvZGVkID0gSlNPTi5wYXJzZSggaW5wdXREZWNvZGVkICk7XG5cdFx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdFx0cmV0dXJuIGlucHV0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICggJ29iamVjdCcgPT09IHR5cGVvZiBpbnB1dERlY29kZWQgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBpbnB1dERlY29kZWQuYm9keSApID8gaW5wdXREZWNvZGVkIDogaW5wdXQ7XG5cdFx0fVxuXHR9LFxuXHRuZXdNaWdyYXRpb246IGZ1bmN0aW9uKCBzZXR0aW5ncyApIHtcblx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlKCk7XG5cdFx0JCggJy5wcm9ncmVzcy1jb250ZW50JyApLnJlbW92ZSgpO1xuXHRcdHRoaXMubWlncmF0aW9uLiRvdmVybGF5ID0gJG92ZXJsYXlPcmlnaW5hbC5jbG9uZSgpO1xuXG5cdFx0JCggJyN3cHdyYXAnICkuYXBwZW5kKCB0aGlzLm1pZ3JhdGlvbi4kb3ZlcmxheSApO1xuXG5cdFx0dGhpcy5taWdyYXRpb24ubW9kZWwgPSBuZXcgTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbCggc2V0dGluZ3MgKTtcblx0XHR0aGlzLm1pZ3JhdGlvbi52aWV3ID0gbmV3IE1pZ3JhdGlvblByb2dyZXNzVmlldygge1xuXHRcdFx0bW9kZWw6IHRoaXMubWlncmF0aW9uLm1vZGVsXG5cdFx0fSApO1xuXG5cdFx0dGhpcy5taWdyYXRpb24uJHByb2dyZXNzID0gJHByb2dyZXNzQ29udGVudE9yaWdpbmFsLmNsb25lKCk7XG5cdFx0dGhpcy5taWdyYXRpb24uJHdyYXBwZXIgPSB0aGlzLm1pZ3JhdGlvbi4kcHJvZ3Jlc3MuZmluZCggJy5taWdyYXRpb24tcHJvZ3Jlc3Mtc3RhZ2VzJyApO1xuXHRcdHRoaXMubWlncmF0aW9uLiRwcm9WZXJzaW9uID0gdGhpcy5taWdyYXRpb24uJG92ZXJsYXkuZmluZCggJy5wcm8tdmVyc2lvbicgKTtcblxuXHRcdHZhciBwcm9WZXJzaW9uSUZyYW1lID0gdGhpcy5taWdyYXRpb24uJHByb1ZlcnNpb24uZmluZCggJ2lmcmFtZScgKS5yZW1vdmUoKS5jbG9uZSgpO1xuXG5cdFx0dGhpcy5taWdyYXRpb24uJHdyYXBwZXIucmVwbGFjZVdpdGgoIHRoaXMubWlncmF0aW9uLnZpZXcuJGVsICk7XG5cdFx0dGhpcy5taWdyYXRpb24uJG92ZXJsYXkucHJlcGVuZCggdGhpcy5taWdyYXRpb24uJHByb2dyZXNzICk7XG5cblx0XHQvLyB0aW1lb3V0IG5lZWRlZCBzbyBjbGFzcyBpcyBhZGRlZCBhZnRlciBlbGVtZW50cyBhcmUgYXBwZW5kZWQgdG8gZG9tIGFuZCB0cmFuc2l0aW9uIHJ1bnMuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5taWdyYXRpb24uJG92ZXJsYXkuYWRkKCBzZWxmLm1pZ3JhdGlvbi4kcHJvZ3Jlc3MgKS5hZGQoIHNlbGYubWlncmF0aW9uLiRwcm9WZXJzaW9uICkucmVtb3ZlQ2xhc3MoICdoaWRlJyApLmFkZENsYXNzKCAnc2hvdycgKTtcblx0XHRcdGlmICggc2VsZi5taWdyYXRpb24uJHByb1ZlcnNpb24ubGVuZ3RoICkge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLm1pZ3JhdGlvbi4kcHJvVmVyc2lvbi5maW5kKCAnLmlmcmFtZScgKS5hcHBlbmQoIHByb1ZlcnNpb25JRnJhbWUgKTtcblx0XHRcdFx0fSwgNTAwICk7XG5cdFx0XHR9XG5cdFx0fSwgMCApO1xuXG5cdFx0Ly8gU3RpY2sgc3RhZ2UgcHJvZ3Jlc3MgdG8gdG9wIG9mIGNvbnRhaW5lclxuXHRcdC8vIHRoaXMubWlncmF0aW9uLiRwcm9ncmVzcy5maW5kKCAnLm1pZ3JhdGlvbi1wcm9ncmVzcy1zdGFnZXMnICkuc2Nyb2xsKCBmdW5jdGlvbigpIHtcblx0XHQvL1x0JCggdGhpcyApLmZpbmQoICcuc3RhZ2UtcHJvZ3Jlc3MnICkuY3NzKCAndG9wJywgJCggdGhpcyApLnNjcm9sbFRvcCgpICk7XG5cdFx0Ly8gfSApO1xuXHRcdC8vIFRPRE86IHJlc29sdmUgXlxuXG5cdFx0dGhpcy5taWdyYXRpb24uY3VycmVudFN0YWdlTnVtID0gMDtcblxuXHRcdHRoaXMubWlncmF0aW9uLiRwcm9WZXJzaW9uLm9uKCAnY2xpY2snLCAnLmNsb3NlLXByby12ZXJzaW9uJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLm1pZ3JhdGlvbi4kcHJvVmVyc2lvbi5maW5kKCAnaWZyYW1lJyApLnJlbW92ZSgpO1xuXHRcdFx0c2VsZi5taWdyYXRpb24uJHByb1ZlcnNpb24uYWRkQ2xhc3MoICdoaWRlIHJlbW92ZScgKTtcblx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRzZWxmLm1pZ3JhdGlvbi4kcHJvVmVyc2lvbi5yZW1vdmUoKTtcblx0XHRcdH0sIDUwMCApO1xuXHRcdH0gKTtcblxuXHRcdHRoaXMubWlncmF0aW9uLm1vZGVsLm9uKCAnbWlncmF0aW9uQ29tcGxldGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdHNlbGYudXRpbHMudXBkYXRlUHJvZ1RhYmxlVmlzaWJpbGl0eVNldHRpbmcoKTtcblx0XHRcdHNlbGYudXRpbHMudXBkYXRlUGF1c2VCZWZvcmVGaW5hbGl6ZVNldHRpbmcoKTtcblx0XHRcdHNlbGYubWlncmF0aW9uLnBhdXNlVGltZXIoKTtcblx0XHR9ICk7XG5cblx0XHRyZXR1cm4gdGhpcy5taWdyYXRpb247XG5cdH0sXG5cdHV0aWxzOiByZXF1aXJlKCAnTWlncmF0aW9uUHJvZ3Jlc3MtdXRpbHMnIClcbn07XG5cbm1vZHVsZS5leHBvcnRzID0gTWlncmF0aW9uUHJvZ3Jlc3NDb250cm9sbGVyO1xuIiwidmFyIE1pZ3JhdGlvblByb2dyZXNzU3RhZ2VNb2RlbCA9IHJlcXVpcmUoICdNaWdyYXRpb25Qcm9ncmVzc1N0YWdlLW1vZGVsJyApO1xudmFyICQgPSBqUXVlcnk7XG5cbnZhciBNaWdyYXRpb25Qcm9ncmVzc01vZGVsID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKCB7XG5cdGRlZmF1bHRzOiB7XG5cdFx0X2luaXRpYWxTdGFnZXM6IG51bGwsXG5cdFx0c3RhZ2VzOiBudWxsLFxuXHRcdGFjdGl2ZVN0YWdlTmFtZTogbnVsbCxcblx0XHRzdGFnZU1vZGVsczogbnVsbCxcblx0XHRsb2NhbFRhYmxlUm93czogbnVsbCxcblx0XHRsb2NhbFRhYmxlU2l6ZXM6IG51bGwsXG5cdFx0cmVtb3RlVGFibGVSb3dzOiBudWxsLFxuXHRcdHJlbW90ZVRhYmxlU2l6ZXM6IG51bGwsXG5cdFx0bWlncmF0aW9uU3RhdHVzOiAnYWN0aXZlJyxcblx0XHRtaWdyYXRpb25JbnRlbnQ6ICdzYXZlZmlsZSdcblx0fSxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXQoICdzdGFnZU1vZGVscycsIHt9ICk7XG5cdFx0dGhpcy5zZXQoICdfaW5pdGlhbFN0YWdlcycsIHRoaXMuZ2V0KCAnc3RhZ2VzJyApICk7XG5cdFx0dGhpcy5zZXQoICdzdGFnZXMnLCBbXSApO1xuXHRcdF8uZWFjaCggdGhpcy5nZXQoICdfaW5pdGlhbFN0YWdlcycgKSwgZnVuY3Rpb24oIHN0YWdlLCBpdGVtcywgZGF0YVR5cGUgKSB7XG5cdFx0XHR0aGlzLmFkZFN0YWdlKCBzdGFnZS5uYW1lLCBpdGVtcywgZGF0YVR5cGUgKTtcblx0XHR9LCB0aGlzICk7XG5cdH0sXG5cdGFkZFN0YWdlOiBmdW5jdGlvbiggbmFtZSwgaXRlbXMsIGRhdGFUeXBlLCBleHRlbmQgKSB7XG5cdFx0dmFyIGl0ZW1zQXJyID0gW107XG5cdFx0dmFyIHN0YWdlO1xuXG5cdFx0Xy5lYWNoKCBpdGVtcywgZnVuY3Rpb24oIGl0ZW0gKSB7XG5cdFx0XHR2YXIgc2l6ZSwgcm93cztcblxuXHRcdFx0aWYgKCAncmVtb3RlJyA9PT0gZGF0YVR5cGUgKSB7XG5cdFx0XHRcdHNpemUgPSB0aGlzLmdldCggJ3JlbW90ZVRhYmxlU2l6ZXMnIClbIGl0ZW0gXTtcblx0XHRcdFx0cm93cyA9IHRoaXMuZ2V0KCAncmVtb3RlVGFibGVSb3dzJyApWyBpdGVtIF07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzaXplID0gdGhpcy5nZXQoICdsb2NhbFRhYmxlU2l6ZXMnIClbIGl0ZW0gXTtcblx0XHRcdFx0cm93cyA9IHRoaXMuZ2V0KCAnbG9jYWxUYWJsZVJvd3MnIClbIGl0ZW0gXTtcblx0XHRcdH1cblxuXHRcdFx0aXRlbXNBcnIucHVzaCgge1xuXHRcdFx0XHRuYW1lOiBpdGVtLFxuXHRcdFx0XHRzaXplOiBzaXplLFxuXHRcdFx0XHRyb3dzOiByb3dzXG5cdFx0XHR9ICk7XG5cdFx0fSwgdGhpcyApO1xuXG5cdFx0c3RhZ2UgPSB7XG5cdFx0XHRuYW1lOiBuYW1lLFxuXHRcdFx0aXRlbXM6IGl0ZW1zQXJyLFxuXHRcdFx0ZGF0YVR5cGU6IGRhdGFUeXBlXG5cdFx0fTtcblxuXHRcdGlmICggJ29iamVjdCcgPT09IHR5cGVvZiBleHRlbmQgKSB7XG5cdFx0XHRzdGFnZSA9ICQuZXh0ZW5kKCBzdGFnZSwgZXh0ZW5kICk7XG5cdFx0fVxuXG5cdFx0dGhpcy5hZGRTdGFnZU1vZGVsKCBzdGFnZSApO1xuXG5cdFx0dGhpcy50cmlnZ2VyKCAnc3RhZ2U6YWRkZWQnLCB0aGlzLmdldCggJ3N0YWdlTW9kZWxzJyApWyBuYW1lIF0gKTtcblx0XHR0aGlzLmdldCggJ3N0YWdlTW9kZWxzJyApWyBuYW1lIF0ub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHRoaXMudHJpZ2dlciggJ2NoYW5nZScgKTtcblx0XHR9LCB0aGlzICk7XG5cblx0XHRyZXR1cm4gdGhpcy5nZXRTdGFnZU1vZGVsKCBzdGFnZS5uYW1lICk7XG5cdH0sXG5cdGFkZFN0YWdlSXRlbTogZnVuY3Rpb24oIHN0YWdlLCBuYW1lLCBzaXplLCByb3dzICkge1xuXHRcdHRoaXMuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UgKS5hZGRJdGVtKCBuYW1lLCBzaXplLCByb3dzICk7XG5cdH0sXG5cdGFkZFN0YWdlTW9kZWw6IGZ1bmN0aW9uKCBzdGFnZSApIHtcblx0XHR2YXIgc3RhZ2VzID0gdGhpcy5nZXQoICdzdGFnZXMnICk7XG5cdFx0dmFyIHN0YWdlTW9kZWxzID0gdGhpcy5nZXQoICdzdGFnZU1vZGVscycgKTtcblx0XHR2YXIgbmV3U3RhZ2VNb2RlbCA9IG5ldyBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlTW9kZWwoIHN0YWdlICk7XG5cblx0XHRzdGFnZXMucHVzaCggc3RhZ2UgKTtcblx0XHRzdGFnZU1vZGVsc1sgc3RhZ2UubmFtZSBdID0gbmV3U3RhZ2VNb2RlbDtcblxuXHRcdHRoaXMuc2V0KCAnc3RhZ2VzJywgc3RhZ2VzICk7XG5cdFx0dGhpcy5zZXQoICdzdGFnZU1vZGVscycsIHN0YWdlTW9kZWxzICk7XG5cdH0sXG5cdGdldFN0YWdlTW9kZWw6IGZ1bmN0aW9uKCBuYW1lICkge1xuXHRcdHJldHVybiB0aGlzLmdldCggJ3N0YWdlTW9kZWxzJyApWyBuYW1lIF07XG5cdH0sXG5cdGdldFN0YWdlSXRlbXM6IGZ1bmN0aW9uKCBzdGFnZSwgbWFwICkge1xuXHRcdHZhciBzdGFnZU1vZGVsID0gdGhpcy5nZXRTdGFnZU1vZGVsKCBzdGFnZSApO1xuXHRcdHZhciBpdGVtcyA9IHN0YWdlTW9kZWwuZ2V0KCAnaXRlbXMnICk7XG5cblx0XHRpZiAoIHVuZGVmaW5lZCA9PT0gbWFwICkge1xuXHRcdFx0cmV0dXJuIGl0ZW1zO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gaXRlbXMubWFwKCBmdW5jdGlvbiggaXRlbSApIHtcblx0XHRcdFx0cmV0dXJuIGl0ZW1bIG1hcCBdO1xuXHRcdFx0fSApO1xuXHRcdH1cblx0fSxcblx0c2V0QWN0aXZlU3RhZ2U6IGZ1bmN0aW9uKCBzdGFnZSApIHtcblx0XHR0aGlzLnNldFN0YWdlQ29tcGxldGUoKTtcblx0XHR0aGlzLnNldCggJ2FjdGl2ZVN0YWdlTmFtZScsIHN0YWdlICk7XG5cdFx0dGhpcy5nZXRTdGFnZU1vZGVsKCBzdGFnZSApLnNldCggJ3N0YXR1cycsICdhY3RpdmUnICk7XG5cdFx0dGhpcy50cmlnZ2VyKCAnY2hhbmdlOmFjdGl2ZVN0YWdlJyApO1xuXHR9LFxuXHRzZXRTdGFnZUNvbXBsZXRlOiBmdW5jdGlvbiggc3RhZ2UgKSB7XG5cdFx0aWYgKCAhIHN0YWdlICkge1xuXHRcdFx0c3RhZ2UgPSB0aGlzLmdldCggJ2FjdGl2ZVN0YWdlTmFtZScgKTtcblx0XHR9XG5cdFx0aWYgKCBudWxsICE9PSBzdGFnZSApIHtcblx0XHRcdHRoaXMuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UgKS5zZXQoICdzdGF0dXMnLCAnY29tcGxldGUnICk7XG5cdFx0fVxuXG5cdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uY3VycmVudFN0YWdlTnVtID0gd3BtZGIuY3VycmVudF9taWdyYXRpb24uY3VycmVudFN0YWdlTnVtICsgMTtcblx0fSxcblx0c2V0TWlncmF0aW9uQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBsYXN0U3RhZ2UgPSB0aGlzLmdldFN0YWdlTW9kZWwoIHRoaXMuZ2V0KCAnYWN0aXZlU3RhZ2VOYW1lJyApICk7XG5cdFx0dGhpcy5zZXRTdGFnZUNvbXBsZXRlKCk7XG5cdFx0dGhpcy50cmlnZ2VyKCAnbWlncmF0aW9uQ29tcGxldGUnICk7XG5cdFx0dGhpcy5zZXQoICdtaWdyYXRpb25TdGF0dXMnLCAnY29tcGxldGUnICk7XG5cdFx0bGFzdFN0YWdlLmFjdGl2YXRlVGFiKCk7XG5cdH1cbn0gKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWdyYXRpb25Qcm9ncmVzc01vZGVsO1xuIiwidmFyICQgPSBqUXVlcnk7XG5cbm1vZHVsZS5leHBvcnRzID0ge1xuXHR1cGRhdGVQcm9nVGFibGVWaXNpYmlsaXR5U2V0dGluZzogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAhIHdwbWRiX2RhdGEucHJvZ190YWJsZXNfdmlzaWJpbGl0eV9jaGFuZ2VkICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR3cG1kYl9kYXRhLnByb2dfdGFibGVzX3Zpc2liaWxpdHlfY2hhbmdlZCA9IGZhbHNlO1xuXG5cdFx0JC5hamF4KCB7XG5cdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhY3Rpb246ICd3cG1kYl9zYXZlX3NldHRpbmcnLFxuXHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuc2F2ZV9zZXR0aW5nLFxuXHRcdFx0XHRzZXR0aW5nOiAncHJvZ190YWJsZXNfaGlkZGVuJyxcblx0XHRcdFx0Y2hlY2tlZDogQm9vbGVhbiggd3BtZGJfZGF0YS5wcm9nX3RhYmxlc19oaWRkZW4gKVxuXHRcdFx0fSxcblx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyggJ0NvdWxkIG5vdCBzYXZlIHByb2dyZXNzIGl0ZW0gdmlzaWJpbGl0eSBzZXR0aW5nJywgZXJyb3JUaHJvd24gKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdH0sXG5cdHVwZGF0ZVBhdXNlQmVmb3JlRmluYWxpemVTZXR0aW5nOiBmdW5jdGlvbigpIHtcblx0XHRpZiAoICEgd3BtZGJfZGF0YS5wYXVzZV9iZWZvcmVfZmluYWxpemVfY2hhbmdlZCApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0d3BtZGJfZGF0YS5wYXVzZV9iZWZvcmVfZmluYWxpemVfY2hhbmdlZCA9IGZhbHNlO1xuXG5cdFx0JC5hamF4KCB7XG5cdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0ZGF0YToge1xuXHRcdFx0XHRhY3Rpb246ICd3cG1kYl9zYXZlX3NldHRpbmcnLFxuXHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuc2F2ZV9zZXR0aW5nLFxuXHRcdFx0XHRzZXR0aW5nOiAncGF1c2VfYmVmb3JlX2ZpbmFsaXplJyxcblx0XHRcdFx0Y2hlY2tlZDogQm9vbGVhbiggd3BtZGJfZGF0YS5wYXVzZV9iZWZvcmVfZmluYWxpemUgKVxuXHRcdFx0fSxcblx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRjb25zb2xlLmxvZyggJ0NvdWxkIG5vdCBzYXZlIHBhdXNlIGJlZm9yZSBmaW5hbGl6ZSBzZXR0aW5nJywgZXJyb3JUaHJvd24gKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdH1cbn07XG4iLCJ2YXIgTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZVZpZXcgPSByZXF1aXJlKCAnLi9NaWdyYXRpb25Qcm9ncmVzc1N0YWdlLXZpZXcuanMnICk7XG52YXIgJCA9IGpRdWVyeTtcblxudmFyIE1pZ3JhdGlvblByb2dyZXNzVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKCB7XG5cdHRhZ05hbWU6ICdkaXYnLFxuXHRjbGFzc05hbWU6ICdtaWdyYXRpb24tcHJvZ3Jlc3Mtc3RhZ2VzJyxcblx0aWQ6ICdtaWdyYXRpb24tcHJvZ3Jlc3Mtc3RhZ2VzJyxcblx0c2VsZjogdGhpcyxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuZW1wdHkoKTtcblxuXHRcdHRoaXMubW9kZWwub24oICdzdGFnZTphZGRlZCcsIGZ1bmN0aW9uKCBzdGFnZU1vZGVsICkge1xuXHRcdFx0dGhpcy5hZGRTdGFnZVZpZXcoIHN0YWdlTW9kZWwgKTtcblx0XHR9LCB0aGlzICk7XG5cblx0XHRfLmVhY2goIHRoaXMubW9kZWwuZ2V0KCAnc3RhZ2VNb2RlbHMnICksIHRoaXMuYWRkU3RhZ2VWaWV3LCB0aGlzICk7XG5cdH0sXG5cdGFkZFN0YWdlVmlldzogZnVuY3Rpb24oIHN0YWdlTW9kZWwgKSB7XG5cdFx0dmFyIG5ld1N0YWdlU3ViVmlldyA9IG5ldyBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlVmlldygge1xuXHRcdFx0bW9kZWw6IHN0YWdlTW9kZWxcblx0XHR9ICk7XG5cdFx0c3RhZ2VNb2RlbC50cmlnZ2VyKCAndmlldzppbml0aWFsaXplZCcsIG5ld1N0YWdlU3ViVmlldyApO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCggbmV3U3RhZ2VTdWJWaWV3LiRlbCApO1xuXHRcdHRoaXMuJGVsLnBhcmVudCgpLmZpbmQoICcuc3RhZ2UtdGFicycgKS5hcHBlbmQoIG5ld1N0YWdlU3ViVmlldy4kdGFiRWxlbSApO1xuXHR9XG59ICk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWlncmF0aW9uUHJvZ3Jlc3NWaWV3O1xuIiwidmFyICQgPSBqUXVlcnk7XG5cbnZhciBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlID0gQmFja2JvbmUuTW9kZWwuZXh0ZW5kKCB7XG5cdGRlZmF1bHRzOiB7XG5cdFx0c3RhdHVzOiAncXVldWVkJyxcblx0XHRfaW5pdGlhbEl0ZW1zOiBudWxsLFxuXHRcdGl0ZW1zOiBudWxsLFxuXHRcdGxvb2t1cEl0ZW1zOiBudWxsLFxuXHRcdHRvdGFsU2l6ZTogMCxcblx0XHR0b3RhbFRyYW5zZmVycmVkOiAwLFxuXHRcdGRhdGFUeXBlOiAnbG9jYWwnLFxuXHRcdG5hbWU6ICcnLFxuXHRcdGl0ZW1zQ29tcGxldGU6IDAsXG5cdFx0c3RyaW5nczogbnVsbFxuXHR9LFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmluaXRTdHJpbmdzKCk7XG5cblx0XHR0aGlzLnNldCggJ19pbml0aWFsSXRlbXMnLCB0aGlzLmdldCggJ2l0ZW1zJyApLnNsaWNlKCkgKTtcblx0XHR0aGlzLnNldCggJ2l0ZW1zJywgW10gKTtcblx0XHR0aGlzLnNldCggJ2xvb2t1cEl0ZW1zJywge30gKTtcblxuXHRcdF8uZWFjaCggdGhpcy5nZXQoICdfaW5pdGlhbEl0ZW1zJyApLCBmdW5jdGlvbiggaXRlbSApIHtcblx0XHRcdHRoaXMuYWRkSXRlbSggaXRlbS5uYW1lLCBpdGVtLnNpemUsIGl0ZW0ucm93cyApO1xuXHRcdH0sIHRoaXMgKTtcblxuXHRcdHRoaXMub24oICd2aWV3OmluaXRpYWxpemVkJywgdGhpcy50cmlnZ2VySXRlbVZpZXdJbml0ICk7XG5cblx0XHR0aGlzLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi51cGRhdGVUaXRsZUVsZW0oKTtcblx0XHR9ICk7XG5cdH0sXG5cdGluaXRTdHJpbmdzOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZGVmYXVsdF9zdHJpbmdzID0ge1xuXHRcdFx0c3RhZ2VfdGl0bGU6IHRoaXMuZ2V0KCAnbmFtZScgKSxcblx0XHRcdG1pZ3JhdGVkOiB3cG1kYl9zdHJpbmdzLm1pZ3JhdGVkLFxuXHRcdFx0cXVldWVkOiB3cG1kYl9zdHJpbmdzLnF1ZXVlZCxcblx0XHRcdGFjdGl2ZTogd3BtZGJfc3RyaW5ncy5ydW5uaW5nLFxuXHRcdFx0Y29tcGxldGU6IHdwbWRiX3N0cmluZ3MuY29tcGxldGUsXG5cdFx0XHRoaWRlOiB3cG1kYl9zdHJpbmdzLmhpZGUsXG5cdFx0XHRzaG93OiB3cG1kYl9zdHJpbmdzLnNob3csXG5cdFx0XHRpdGVtc05hbWU6IHdwbWRiX3N0cmluZ3MudGFibGVzXG5cdFx0fTtcblx0XHR2YXIgc3RyaW5ncyA9IHRoaXMuZ2V0KCAnc3RyaW5ncycgKTtcblxuXHRcdHN0cmluZ3MgPSAoICdvYmplY3QnID09PSB0eXBlb2Ygc3RyaW5ncyApID8gc3RyaW5ncyA6IHt9O1xuXHRcdHN0cmluZ3MgPSAkLmV4dGVuZCggZGVmYXVsdF9zdHJpbmdzLCBzdHJpbmdzICk7XG5cblx0XHRzdHJpbmdzLml0ZW1zX21pZ3JhdGVkID0gc3RyaW5ncy5pdGVtc05hbWUgKyAnICcgKyBzdHJpbmdzLm1pZ3JhdGVkO1xuXHRcdHN0cmluZ3MuaGlkZV9pdGVtcyA9IHN0cmluZ3MuaGlkZSArICcgJyArIHN0cmluZ3MuaXRlbXNOYW1lO1xuXHRcdHN0cmluZ3Muc2hvd19pdGVtcyA9IHN0cmluZ3Muc2hvdyArICcgJyArIHN0cmluZ3MuaXRlbXNOYW1lO1xuXG5cdFx0dGhpcy5zZXQoICdzdHJpbmdzJywgc3RyaW5ncyApO1xuXHR9LFxuXHRhZGRJdGVtOiBmdW5jdGlvbiggbmFtZSwgc2l6ZSwgcm93cyApIHtcblx0XHR2YXIgaXRlbXMgPSB0aGlzLmdldCggJ2l0ZW1zJyApO1xuXHRcdHZhciBpdGVtID0ge1xuXHRcdFx0bmFtZTogbmFtZSxcblx0XHRcdHNpemU6IHNpemUgfHwgMSxcblx0XHRcdHJvd3M6IHJvd3MgfHwgc2l6ZSxcblx0XHRcdHN0YWdlTmFtZTogdGhpcy5nZXQoICduYW1lJyApLFxuXHRcdFx0JGVsOiBudWxsLFxuXHRcdFx0dHJhbnNmZXJyZWQ6IDAsXG5cdFx0XHRyb3dzVHJhbnNmZXJyZWQ6IDAsXG5cdFx0XHRjb21wbGV0ZTogZmFsc2Vcblx0XHR9O1xuXG5cdFx0aXRlbXMucHVzaCggaXRlbSApO1xuXHRcdHRoaXMuZ2V0KCAnbG9va3VwSXRlbXMnIClbIG5hbWUgXSA9IGl0ZW1zLmxlbmd0aCAtIDE7XG5cblx0XHR0aGlzLnNldCggJ3RvdGFsU2l6ZScsIHBhcnNlSW50KCB0aGlzLmdldCggJ3RvdGFsU2l6ZScgKSApICsgcGFyc2VJbnQoIHNpemUgKSApO1xuXHRcdHRoaXMudHJpZ2dlciggJ2l0ZW06YWRkZWQnLCBpdGVtICk7XG5cdH0sXG5cdHRyaWdnZXJJdGVtVmlld0luaXQ6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpdGVtcyA9IHRoaXMuZ2V0KCAnaXRlbXMnICk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdF8uZWFjaCggaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdFx0c2VsZi50cmlnZ2VyKCAnaXRlbTphZGRlZCcsIGl0ZW0gKTtcblx0XHR9ICk7XG5cdH0sXG5cdGdldFRvdGFsU2l6ZVRyYW5zZmVycmVkOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gdGhpcy5nZXQoICd0b3RhbFRyYW5zZmVycmVkJyApO1xuXHR9LFxuXHRjb3VudEl0ZW1zQ29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB0aGlzLmdldCggJ2l0ZW1zQ29tcGxldGUnICk7XG5cdH0sXG5cdGdldFRvdGFsUHJvZ3Jlc3NQZXJjZW50OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdHJhbnNmZXJyZWQgPSB0aGlzLmdldFRvdGFsU2l6ZVRyYW5zZmVycmVkKCk7XG5cdFx0dmFyIHRvdGFsID0gdGhpcy5nZXQoICd0b3RhbFNpemUnICk7XG5cdFx0aWYgKCAwID49IHRyYW5zZmVycmVkIHx8IDAgPj0gdG90YWwgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0cmV0dXJuIE1hdGgubWluKCAxMDAsIE1hdGgucm91bmQoICggdHJhbnNmZXJyZWQgLyB0b3RhbCAgKSAqIDEwMCApICk7XG5cdH0sXG5cdGFjdGl2YXRlVGFiOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnRyaWdnZXIoICdhY3RpdmF0ZVRhYicgKTtcblx0fSxcblx0c2V0SXRlbUNvbXBsZXRlOiBmdW5jdGlvbiggaXRlbU5hbWUgKSB7XG5cdFx0dmFyIGl0ZW0gPSB0aGlzLmdldEl0ZW1CeU5hbWUoIGl0ZW1OYW1lICk7XG5cdFx0dmFyIHRvdGFsVHJhbnNmZXJyZWQgPSB0aGlzLmdldCggJ3RvdGFsVHJhbnNmZXJyZWQnICk7XG5cdFx0dmFyIGl0ZW1zQ29tcGxldGUgPSB0aGlzLmdldCggJ2l0ZW1zQ29tcGxldGUnICk7XG5cblx0XHR0aGlzLnNldCggJ2l0ZW1zQ29tcGxldGUnLCArK2l0ZW1zQ29tcGxldGUgKTtcblxuXHRcdHRvdGFsVHJhbnNmZXJyZWQgKz0gaXRlbS5zaXplIC0gaXRlbS50cmFuc2ZlcnJlZDtcblx0XHR0aGlzLnNldCggJ3RvdGFsVHJhbnNmZXJyZWQnLCB0b3RhbFRyYW5zZmVycmVkICk7XG5cblx0XHRpdGVtLnRyYW5zZmVycmVkID0gaXRlbS5zaXplO1xuXHRcdGl0ZW0uY29tcGxldGUgPSB0cnVlO1xuXHRcdGl0ZW0ucm93c1RyYW5zZmVycmVkID0gaXRlbS5yb3dzO1xuXHRcdHRoaXMudHJpZ2dlciggJ2NoYW5nZSBjaGFuZ2U6aXRlbXMnLCBpdGVtICk7XG5cdH0sXG5cdHNldEl0ZW1Sb3dzVHJhbnNmZXJyZWQ6IGZ1bmN0aW9uKCBpdGVtTmFtZSwgbnVtUm93cyApIHtcblx0XHR2YXIgYW10RG9uZSwgZXN0VHJhbnNmZXJyZWQ7XG5cdFx0dmFyIGl0ZW0gPSB0aGlzLmdldEl0ZW1CeU5hbWUoIGl0ZW1OYW1lICk7XG5cdFx0dmFyIHRvdGFsVHJhbnNmZXJyZWQgPSB0aGlzLmdldCggJ3RvdGFsVHJhbnNmZXJyZWQnICk7XG5cblx0XHRpZiAoIC0xID09PSBwYXJzZUludCggbnVtUm93cyApICkge1xuXHRcdFx0YW10RG9uZSA9IDE7XG5cdFx0fSBlbHNlIHtcblx0XHRcdGFtdERvbmUgPSBNYXRoLm1pbiggMSwgbnVtUm93cyAvIGl0ZW0ucm93cyApO1xuXHRcdH1cblxuXHRcdGlmICggMSA9PT0gYW10RG9uZSApIHtcblx0XHRcdHRoaXMuc2V0SXRlbUNvbXBsZXRlKCBpdGVtTmFtZSApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGVzdFRyYW5zZmVycmVkID0gaXRlbS5zaXplICogYW10RG9uZTtcblxuXHRcdHRvdGFsVHJhbnNmZXJyZWQgKz0gZXN0VHJhbnNmZXJyZWQgLSBpdGVtLnRyYW5zZmVycmVkO1xuXHRcdHRoaXMuc2V0KCAndG90YWxUcmFuc2ZlcnJlZCcsIHRvdGFsVHJhbnNmZXJyZWQgKTtcblxuXHRcdGl0ZW0udHJhbnNmZXJyZWQgPSBlc3RUcmFuc2ZlcnJlZDtcblx0XHRpdGVtLnJvd3NUcmFuc2ZlcnJlZCA9IG51bVJvd3M7XG5cdFx0dGhpcy50cmlnZ2VyKCAnY2hhbmdlIGNoYW5nZTppdGVtcycsIGl0ZW0gKTtcblx0fSxcblx0Z2V0SXRlbUJ5TmFtZTogZnVuY3Rpb24oIGl0ZW1OYW1lICkge1xuXHRcdHZhciBpdGVtID0gdGhpcy5nZXQoICdpdGVtcycgKVsgdGhpcy5nZXQoICdsb29rdXBJdGVtcycgKVsgaXRlbU5hbWUgXSBdIHx8IHt9O1xuXHRcdGlmICggaXRlbU5hbWUgPT09IGl0ZW0ubmFtZSApIHtcblx0XHRcdHJldHVybiBpdGVtO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gdGhpcy5kZXRlcm1pbmVJdGVtQnlOYW1lKCBpdGVtTmFtZSApO1xuXHRcdH1cblx0fSxcblx0ZGV0ZXJtaW5lSXRlbUJ5TmFtZTogZnVuY3Rpb24oIGl0ZW1OYW1lICkge1xuXHRcdHZhciBpdGVtcyA9IHRoaXMuZ2V0KCAnaXRlbXMnICk7XG5cdFx0Zm9yICggdmFyIGluZGV4ID0gMDsgaW5kZXggPCBpdGVtcy5sZW5ndGg7IGluZGV4KysgKSB7XG5cdFx0XHR2YXIgaXRlbSA9IGl0ZW1zWyBpbmRleCBdO1xuXHRcdFx0aWYgKCBpdGVtTmFtZSA9PT0gaXRlbS5uYW1lICkge1xuXHRcdFx0XHR0aGlzLmdldCggJ2xvb2t1cEl0ZW1zJyApLml0ZW1OYW1lID0gaW5kZXg7XG5cdFx0XHRcdHJldHVybiBpdGVtO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxufSApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZ3JhdGlvblByb2dyZXNzU3RhZ2U7XG4iLCJ2YXIgJCA9IGpRdWVyeTtcblxudmFyIE1pZ3JhdGlvblByb2dyZXNzU3RhZ2VWaWV3ID0gQmFja2JvbmUuVmlldy5leHRlbmQoIHtcblx0dGFnTmFtZTogJ2RpdicsXG5cdGNsYXNzTmFtZTogJ21pZ3JhdGlvbi1wcm9ncmVzcy1zdGFnZS1jb250YWluZXIgaGlkZS10YWJsZXMnLFxuXHQkdG90YWxQcm9ncmVzc0VsZW06IG51bGwsXG5cdCR0YWJFbGVtOiBudWxsLFxuXHQkc2hvd0hpZGVUYWJsZXNFbGVtOiBudWxsLFxuXHQkcGF1c2VCZWZvcmVGaW5hbGl6ZUVsZW06IG51bGwsXG5cdCRwYXVzZUJlZm9yZUZpbmFsaXplQ2hlY2tib3g6IG51bGwsXG5cdCRpdGVtc0NvbnRhaW5lcjogbnVsbCxcblx0aXRlbVZpZXdzOiBudWxsLFxuXHRtYXhEb21Ob2RlczogMTAwLFxuXHR2aXNpYmxlRG9tTm9kZXM6IDAsXG5cdHF1ZXVlZEVsZW1lbnRzOiBudWxsLFxuXHQkdHJ1bmNhdGlvbk5vdGljZTogbnVsbCxcblx0JHRydW5jYXRpb25Ob3RpY2VIaWRkZW5JdGVtczogbnVsbCxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kZWwuZW1wdHkoKTtcblx0XHR0aGlzLiRlbC5hdHRyKCAnZGF0YS1zdGFnZScsIHRoaXMubW9kZWwuZ2V0KCAnbmFtZScgKSApLmFkZENsYXNzKCAncXVldWVkICcgKyB0aGlzLm1vZGVsLmdldCggJ25hbWUnICkgKTtcblxuXHRcdHRoaXMucXVldWVkRWxlbWVudHMgPSBbXTtcblxuXHRcdHRoaXMuaW5pdFRvdGFsUHJvZ3Jlc3NFbGVtKCk7XG5cdFx0dGhpcy4kZWwucHJlcGVuZCggdGhpcy4kdG90YWxQcm9ncmVzc0VsZW0gKTtcblxuXHQgICAgdGhpcy4kaXRlbXNDb250YWluZXIgPSAkKCAnPGRpdiBjbGFzcz1wcm9ncmVzcy1pdGVtcyAvPicgKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQoIHRoaXMuJGl0ZW1zQ29udGFpbmVyICk7XG5cblx0XHR0aGlzLmluaXRUYWJFbGVtKCk7XG5cblx0XHR0aGlzLm1vZGVsLm9uKCAnaXRlbTphZGRlZCcsIHRoaXMubWF5YmVBZGRFbGVtZW50VG9WaWV3LCB0aGlzICk7XG5cblx0XHRfLmVhY2goIHRoaXMubW9kZWwuZ2V0KCAnaXRlbU1vZGVscycgKSwgdGhpcy5tYXliZUFkZEVsZW1lbnRUb1ZpZXcsIHRoaXMgKTtcblx0XHR0aGlzLm1vZGVsLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnVwZGF0ZVByb2dyZXNzRWxlbSgpO1xuXHRcdFx0dGhpcy51cGRhdGVTdGFnZVRvdGFscygpO1xuXHRcdH0sIHRoaXMgKTtcblxuXHRcdHRoaXMubW9kZWwub24oICdjaGFuZ2U6c3RhdHVzJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHR0aGlzLiRlbC5yZW1vdmVDbGFzcyggJ3F1ZXVlZCBhY3RpdmUnICkuYWRkQ2xhc3MoIHRoaXMubW9kZWwuZ2V0KCAnc3RhdHVzJyApICk7XG5cdFx0XHR0aGlzLiR0YWJFbGVtLnJlbW92ZUNsYXNzKCAncXVldWVkIGFjdGl2ZScgKS5hZGRDbGFzcyggdGhpcy5tb2RlbC5nZXQoICdzdGF0dXMnICkgKVxuXHRcdFx0XHQuZmluZCggJy5zdGFnZS1zdGF0dXMnICkudGV4dCggdGhpcy5tb2RlbC5nZXQoICdzdHJpbmdzJyApWyB0aGlzLm1vZGVsLmdldCggJ3N0YXR1cycgKSBdICk7XG5cdFx0fSwgdGhpcyApO1xuXG5cdFx0dGhpcy5tb2RlbC5vbiggJ2NoYW5nZTppdGVtcycsIGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdFx0aWYgKCBpdGVtLm5hbWUgKSB7XG5cdFx0XHRcdHRoaXMuc2V0SXRlbVByb2dyZXNzKCBpdGVtICk7XG5cdFx0XHR9XG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRpbml0VG90YWxQcm9ncmVzc0VsZW06IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaW5pdFNob3dIaWRlVGFibGVzRWxlbSgpO1xuXHRcdHRoaXMuaW5pdFBhdXNlQmVmb3JlRmluYWxpemVFbGVtKCk7XG5cblx0XHR0aGlzLiR0b3RhbFByb2dyZXNzRWxlbSA9ICQoICc8ZGl2IGNsYXNzPXN0YWdlLXByb2dyZXNzIC8+JyApXG5cdFx0XHQuYXBwZW5kKCAnPHNwYW4gY2xhc3M9cGVyY2VudC1jb21wbGV0ZT4wPC9zcGFuPiUgJyArIHRoaXMubW9kZWwuZ2V0KCAnc3RyaW5ncycgKS5jb21wbGV0ZSArICcgJyApXG5cdFx0XHQuYXBwZW5kKCAnKDxzcGFuIGNsYXNzPXNpemUtY29tcGxldGU+MCBNQjwvc3Bhbj4gLyA8c3BhbiBjbGFzcz1zaXplLXRvdGFsPjAgTUI8L3NwYW4+KSAnIClcblx0XHRcdC5hcHBlbmQoICc8c3BhbiBjbGFzcz10YWJsZXMtY29tcGxldGU+MDwvc3Bhbj4gPHNwYW4gY2xhc3M9bG93ZXJjYXNlID5vZjwvc3Bhbj4gPHNwYW4gY2xhc3M9dGFibGVzLXRvdGFsPjA8L3NwYW4+ICcgKyB0aGlzLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuaXRlbXNfbWlncmF0ZWQgKVxuXHRcdFx0LmFwcGVuZCggdGhpcy4kc2hvd0hpZGVUYWJsZXNFbGVtIClcblx0XHRcdC5hcHBlbmQoICc8ZGl2IGNsYXNzPXByb2dyZXNzLWJhci13cmFwcGVyPjxkaXYgY2xhc3M9cHJvZ3Jlc3MtYmFyIC8+PC9kaXY+JyApO1xuXG5cdFx0dGhpcy51cGRhdGVTdGFnZVRvdGFscygpO1xuXHR9LFxuXHRpbml0U2hvd0hpZGVUYWJsZXNFbGVtOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRzaG93SGlkZVRhYmxlc0VsZW0gPSAkKCAnPGEgY2xhc3M9c2hvdy1oaWRlLXRhYmxlcy8+JyApLnRleHQoIHRoaXMubW9kZWwuZ2V0KCAnc3RyaW5ncycgKS5zaG93X2l0ZW1zICk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHRoaXMuJHNob3dIaWRlVGFibGVzRWxlbS5vbiggJ2NsaWNrIHNob3ctaGlkZS1wcm9ncmVzcy10YWJsZXMnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBwcm9nVGFibGVzSGlkZGVuO1xuXHRcdFx0aWYgKCBzZWxmLiRlbC5oYXNDbGFzcyggJ2hpZGUtdGFibGVzJyApICkgeyAvLyBzaG93IHRhYmxlc1xuXHRcdFx0XHRwcm9nVGFibGVzSGlkZGVuID0gZmFsc2U7XG5cdFx0XHRcdHNlbGYuJGVsLmFkZCggc2VsZi4kZWwuc2libGluZ3MoKSApLnJlbW92ZUNsYXNzKCAnaGlkZS10YWJsZXMnICk7XG5cdFx0XHRcdHNlbGYuJHNob3dIaWRlVGFibGVzRWxlbS50ZXh0KCBzZWxmLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuaGlkZV9pdGVtcyApO1xuXHRcdFx0fSBlbHNlIHsgLy8gaGlkZSB0YWJsZXNcblx0XHRcdFx0cHJvZ1RhYmxlc0hpZGRlbiA9IHRydWU7XG5cdFx0XHRcdHNlbGYuJGVsLmFkZCggc2VsZi4kZWwuc2libGluZ3MoKSApLmFkZENsYXNzKCAnaGlkZS10YWJsZXMnICk7XG5cdFx0XHRcdHNlbGYuJHNob3dIaWRlVGFibGVzRWxlbS50ZXh0KCBzZWxmLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuc2hvd19pdGVtcyApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIEJvb2xlYW4oIHByb2dUYWJsZXNIaWRkZW4gKSAhPT0gQm9vbGVhbiggd3BtZGJfZGF0YS5wcm9nX3RhYmxlc19oaWRkZW4gKSApIHtcblx0XHRcdFx0d3BtZGJfZGF0YS5wcm9nX3RhYmxlc192aXNpYmlsaXR5X2NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR3cG1kYl9kYXRhLnByb2dfdGFibGVzX2hpZGRlbiA9IHByb2dUYWJsZXNIaWRkZW47XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0Ly8gc2hvdyBwcm9ncmVzcyB0YWJsZXMgb24gaW5pdCBpZiBoaWRkZW4gaXMgZmFsc2Vcblx0XHRpZiAoICEgd3BtZGJfZGF0YS5wcm9nX3RhYmxlc19oaWRkZW4gKSB7XG5cdFx0XHR0aGlzLiRzaG93SGlkZVRhYmxlc0VsZW0udHJpZ2dlckhhbmRsZXIoICdzaG93LWhpZGUtcHJvZ3Jlc3MtdGFibGVzJyApO1xuXHRcdH1cblxuXHRcdC8vIG1ha2Ugc3VyZSB0ZXh0IHJlZmxlY3RzIGN1cnJlbnQgc3RhdGUgd2hlbiBzaG93aW5nXG5cdFx0dGhpcy5tb2RlbC5vbiggJ2NoYW5nZTpzdGF0dXMgYWN0aXZhdGVUYWInLCBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggd3BtZGJfZGF0YS5wcm9nX3RhYmxlc19oaWRkZW4gKSB7XG5cdFx0XHRcdHNlbGYuJHNob3dIaWRlVGFibGVzRWxlbS50ZXh0KCBzZWxmLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuc2hvd19pdGVtcyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2VsZi4kc2hvd0hpZGVUYWJsZXNFbGVtLnRleHQoIHNlbGYubW9kZWwuZ2V0KCAnc3RyaW5ncycgKS5oaWRlX2l0ZW1zICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0dGhpcy5tb2RlbC5vbiggJ2FjdGl2YXRlVGFiJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICdjb21wbGV0ZScgPT09IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLmdldCggJ21pZ3JhdGlvblN0YXR1cycgKSApIHtcblx0XHRcdFx0c2VsZi4kdGFiRWxlbS5hZGRDbGFzcyggJ2FjdGl2ZScgKS5zaWJsaW5ncygpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0XHRzZWxmLiRlbC5hZGRDbGFzcyggJ2FjdGl2ZScgKS5zaWJsaW5ncygpLnJlbW92ZUNsYXNzKCAnYWN0aXZlJyApO1xuXHRcdFx0fVxuXHRcdH0gKTtcblx0fSxcblx0aW5pdFBhdXNlQmVmb3JlRmluYWxpemVFbGVtOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplRWxlbSA9ICQoICcucGF1c2UtYmVmb3JlLWZpbmFsaXplJyApO1xuXHRcdHRoaXMuJHBhdXNlQmVmb3JlRmluYWxpemVDaGVja2JveCA9IHRoaXMuJHBhdXNlQmVmb3JlRmluYWxpemVFbGVtLmZpbmQoICdpbnB1dFt0eXBlPWNoZWNrYm94XScgKTtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dmFyIGlzQ2hlY2tlZCA9IGZhbHNlO1xuXHRcdHZhciBtaWdyYXRpb25JbnRlbnQgPSB3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXQoICdtaWdyYXRpb25JbnRlbnQnICk7XG5cblx0XHQvLyBtYWtlIHN1cmUgY2hlY2tib3ggaXMgY2hlY2tlZCBiYXNlZCBvbiBjdXJyZW50IHN0YXRlXG5cdFx0aWYgKCB3cG1kYl9kYXRhLnBhdXNlX2JlZm9yZV9maW5hbGl6ZSApIHtcblx0XHRcdGlzQ2hlY2tlZCA9IHRydWU7XG5cdFx0fVxuXHRcdHRoaXMuJHBhdXNlQmVmb3JlRmluYWxpemVDaGVja2JveC5wcm9wKCAnY2hlY2tlZCcsIGlzQ2hlY2tlZCApO1xuXG5cdFx0Ly8gb25seSBkaXNwbGF5IG9uIHB1c2hlcyBhbmQgcHVsbHNcblx0XHRpZiAoICdwdXNoJyA9PT0gbWlncmF0aW9uSW50ZW50IHx8ICdwdWxsJyA9PT0gbWlncmF0aW9uSW50ZW50ICkge1xuXHRcdFx0dGhpcy4kcGF1c2VCZWZvcmVGaW5hbGl6ZUVsZW0uc2hvdygpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplRWxlbS5oaWRlKCk7XG5cdFx0fVxuXG5cdFx0Ly8gaGlkZSBvbiBtZWRpYSBzdGFnZVxuXHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLm9uKCAnY2hhbmdlOmFjdGl2ZVN0YWdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICdtZWRpYScgPT09IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLmdldCggJ2FjdGl2ZVN0YWdlTmFtZScgKSApIHtcblx0XHRcdFx0c2VsZi4kcGF1c2VCZWZvcmVGaW5hbGl6ZUVsZW0uaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdHRoaXMuJHBhdXNlQmVmb3JlRmluYWxpemVFbGVtLm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBwYXVzZUJlZm9yZUZpbmFsaXplVmFsdWUgPSBCb29sZWFuKCBzZWxmLiRwYXVzZUJlZm9yZUZpbmFsaXplQ2hlY2tib3guaXMoICc6Y2hlY2tlZCcgKSApO1xuXHRcdFx0aWYgKCBwYXVzZUJlZm9yZUZpbmFsaXplVmFsdWUgIT09IEJvb2xlYW4oIHdwbWRiX2RhdGEucGF1c2VfYmVmb3JlX2ZpbmFsaXplICkgKSB7XG5cdFx0XHRcdHdwbWRiX2RhdGEucGF1c2VfYmVmb3JlX2ZpbmFsaXplX2NoYW5nZWQgPSB0cnVlO1xuXHRcdFx0XHR3cG1kYl9kYXRhLnBhdXNlX2JlZm9yZV9maW5hbGl6ZSA9IHBhdXNlQmVmb3JlRmluYWxpemVWYWx1ZTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdH0sXG5cdGluaXRUYWJFbGVtOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy4kdGFiRWxlbSA9ICQoICc8YSBjbGFzcz1zdGFnZS10YWI+JyApXG5cdFx0XHQuYXBwZW5kKCAnPHNwYW4gY2xhc3M9c3RhZ2UtdGl0bGU+JyArIHRoaXMubW9kZWwuZ2V0KCAnc3RyaW5ncycgKS5zdGFnZV90aXRsZSArICc8L3NwYW4+ICcgKVxuXHRcdFx0LmFwcGVuZCggJzxzcGFuIGNsYXNzPXN0YWdlLXN0YXR1cz4nICsgdGhpcy5tb2RlbC5nZXQoICdzdHJpbmdzJyApLnF1ZXVlZCArICc8L3NwYW4+ICcgKVxuXHRcdFx0Lm9uKCAnY2xpY2snLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5tb2RlbC5hY3RpdmF0ZVRhYigpO1xuXHRcdFx0fSApO1xuXHR9LFxuXHR1cGRhdGVQcm9ncmVzc0VsZW06IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBwZXJjZW50RG9uZSA9IE1hdGgubWF4KCAwLCB0aGlzLm1vZGVsLmdldFRvdGFsUHJvZ3Jlc3NQZXJjZW50KCkgKTtcblx0XHR2YXIgc2l6ZURvbmUgPSB3cG1kYi5mdW5jdGlvbnMuY29udmVydEtCU2l6ZVRvSFJGaXhlZCggTWF0aC5taW4oIHRoaXMubW9kZWwuZ2V0VG90YWxTaXplVHJhbnNmZXJyZWQoKSwgdGhpcy5tb2RlbC5nZXQoICd0b3RhbFNpemUnICkgKSApO1xuXHRcdHZhciB0YWJsZXNEb25lID0gTWF0aC5taW4oIHRoaXMubW9kZWwuY291bnRJdGVtc0NvbXBsZXRlKCksIHRoaXMubW9kZWwuZ2V0KCAnaXRlbXMnICkubGVuZ3RoICk7XG5cblx0XHRpZiAoICdjb21wbGV0ZScgPT09IHRoaXMubW9kZWwuZ2V0KCAnc3RhdHVzJyApICYmIDAgPT09IHRoaXMubW9kZWwuZ2V0KCAndG90YWxTaXplJyApICkge1xuXHRcdFx0cGVyY2VudERvbmUgPSAxMDA7XG5cdFx0XHR0aGlzLiRzaG93SGlkZVRhYmxlc0VsZW0uZmFkZU91dCgpO1xuXHRcdH1cblxuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcucGVyY2VudC1jb21wbGV0ZScgKS50ZXh0KCBwZXJjZW50RG9uZSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcuc2l6ZS1jb21wbGV0ZScgKS50ZXh0KCBzaXplRG9uZSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcudGFibGVzLWNvbXBsZXRlJyApLnRleHQoIHdwbWRiX2FkZF9jb21tYXMoIHRhYmxlc0RvbmUgKSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcucHJvZ3Jlc3MtYmFyLXdyYXBwZXIgLnByb2dyZXNzLWJhcicgKS5jc3MoIHsgd2lkdGg6IHBlcmNlbnREb25lICsgJyUnIH0gKTtcblx0fSxcblx0dXBkYXRlU3RhZ2VUb3RhbHM6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBpdGVtQ291bnQgPSB0aGlzLm1vZGVsLmdldCggJ2l0ZW1zJyApLmxlbmd0aDtcblx0XHR0aGlzLiR0b3RhbFByb2dyZXNzRWxlbS5maW5kKCAnLnRhYmxlcy10b3RhbCcgKS50ZXh0KCB3cG1kYl9hZGRfY29tbWFzKCBpdGVtQ291bnQgKSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcuc2l6ZS10b3RhbCcgKS50ZXh0KCB3cG1kYi5mdW5jdGlvbnMuY29udmVydEtCU2l6ZVRvSFIoIHRoaXMubW9kZWwuZ2V0KCAndG90YWxTaXplJyApICkgKTtcblx0fSxcblx0aW5pdGlhbGl6ZUl0ZW1FbGVtZW50OiBmdW5jdGlvbiggaXRlbSApIHtcblx0XHR2YXIgJGVsID0gJCggJzxkaXYgY2xhc3M9XCJpdGVtLXByb2dyZXNzXCIgLz4nICk7XG5cdFx0dmFyICRwcm9ncmVzcyA9ICQoICc8ZGl2IGNsYXNzPVwicHJvZ3Jlc3MtYmFyXCIvPicgKS5jc3MoICd3aWR0aCcsICcwJScgKTtcblx0XHR2YXIgJHRpdGxlID0gJCggJzxwPicgKS5hZGRDbGFzcyggJ2l0ZW0taW5mbycgKVxuXHRcdFx0LmFwcGVuZCggJCggJzxzcGFuIGNsYXNzPVwibmFtZVwiIC8+JyApLnRleHQoIGl0ZW0ubmFtZSApIClcblx0XHRcdC5hcHBlbmQoICcgJyApXG5cdFx0XHQuYXBwZW5kKCAkKCAnPHNwYW4gY2xhc3M9XCJzaXplXCIgLz4nICkudGV4dCggJygnICsgd3BtZGIuZnVuY3Rpb25zLmNvbnZlcnRLQlNpemVUb0hSRml4ZWQoIGl0ZW0uc2l6ZSApICsgJyknICkgKTtcblxuXHRcdCRlbC5hcHBlbmQoICR0aXRsZSApO1xuXHRcdCRlbC5hcHBlbmQoICRwcm9ncmVzcyApO1xuXHRcdCRlbC5hcHBlbmQoICc8c3BhbiBjbGFzcz1cImRhc2hpY29ucyBkYXNoaWNvbnMteWVzXCIvPicgKTtcblxuXHRcdCRlbC5hdHRyKCAnaWQnLCAnaXRlbS0nICsgaXRlbS5uYW1lICk7XG5cdFx0JGVsLmF0dHIoICdkYXRhLXN0YWdlJywgdGhpcy5tb2RlbC5nZXQoICduYW1lJyApICk7XG5cblx0XHRpdGVtLiRlbCA9ICRlbDtcblx0XHRpdGVtLiRwcm9ncmVzcyA9ICRwcm9ncmVzcztcblx0XHRpdGVtLiR0aXRsZSA9ICR0aXRsZTtcblxuXHRcdHJldHVybiBpdGVtO1xuXHR9LFxuXHRtYXliZUFkZEVsZW1lbnRUb1ZpZXc6IGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdGlmICggdGhpcy52aXNpYmxlRG9tTm9kZXMgPCB0aGlzLm1heERvbU5vZGVzICkge1xuXHRcdFx0Kyt0aGlzLnZpc2libGVEb21Ob2Rlcztcblx0XHRcdHRoaXMuJGl0ZW1zQ29udGFpbmVyLmFwcGVuZCggdGhpcy5pbml0aWFsaXplSXRlbUVsZW1lbnQoIGl0ZW0gKS4kZWwgKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy5xdWV1ZWRFbGVtZW50cy5wdXNoKCBpdGVtICk7XG5cdFx0XHRpZiAoICEgdGhpcy4kdHJ1bmNhdGlvbk5vdGljZSApIHtcblx0XHRcdFx0dGhpcy5zaG93VHJ1bmNhdGlvbk5vdGljZSgpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGhpcy51cGRhdGVUcnVuY2F0aW9uTm90aWNlKCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9LFxuXHRzaG93VHJ1bmNhdGlvbk5vdGljZTogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCB0aGlzLiR0cnVuY2F0aW9uTm90aWNlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHR0aGlzLiR0cnVuY2F0aW9uTm90aWNlID0gJCggJzxkaXYgY2xhc3M9XCJ0cnVuY2F0aW9uLW5vdGljZVwiID4nICsgd3BtZGJfc3RyaW5ncy5wcm9ncmVzc19pdGVtc190cnVuY2F0ZWRfbXNnLnJlcGxhY2UoICclMSRzJywgJzxzcGFuIGNsYXNzPVwiaGlkZGVuLWl0ZW1zXCI+JyArIHdwbWRiX2FkZF9jb21tYXMoIHRoaXMucXVldWVkRWxlbWVudHMubGVuZ3RoICkgKyAnPC9zcGFuPicgKSArICc8L2Rpdj4nICk7XG5cdFx0dGhpcy4kdHJ1bmNhdGlvbk5vdGljZUhpZGRlbkl0ZW1zID0gdGhpcy4kdHJ1bmNhdGlvbk5vdGljZS5maW5kKCAnLmhpZGRlbi1pdGVtcycgKTtcblx0XHR0aGlzLiRpdGVtc0NvbnRhaW5lci5hZnRlciggdGhpcy4kdHJ1bmNhdGlvbk5vdGljZSApO1xuXHR9LFxuXHR1cGRhdGVUcnVuY2F0aW9uTm90aWNlOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiR0cnVuY2F0aW9uTm90aWNlSGlkZGVuSXRlbXMudGV4dCggd3BtZGJfYWRkX2NvbW1hcyggdGhpcy5xdWV1ZWRFbGVtZW50cy5sZW5ndGggKSApO1xuXHR9LFxuXHRnZXROZXh0RWxlbWVudEZvclZpZXc6IGZ1bmN0aW9uKCAkZWwgKSB7XG5cdFx0dmFyIHF1ZXVlSXRlbTtcblx0XHRpZiAoIHRoaXMucXVldWVkRWxlbWVudHMubGVuZ3RoICkge1xuXHRcdFx0aWYgKCAkZWwgKSB7XG5cdFx0XHRcdHRoaXMucXVldWVkRWxlbWVudHMucHVzaCggJGVsICk7XG5cdFx0XHR9XG5cdFx0XHRxdWV1ZUl0ZW0gPSB0aGlzLnF1ZXVlZEVsZW1lbnRzLnNoaWZ0KCk7XG5cdFx0XHRpZiAoIHF1ZXVlSXRlbSBpbnN0YW5jZW9mICQgKSB7XG5cdFx0XHRcdCRlbCA9IHF1ZXVlSXRlbTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCRlbCA9IHRoaXMuaW5pdGlhbGl6ZUl0ZW1FbGVtZW50KCBxdWV1ZUl0ZW0gKS4kZWw7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiAkZWw7XG5cdH0sXG5cdHNldEl0ZW1Qcm9ncmVzczogZnVuY3Rpb24oIGl0ZW0gKSB7XG5cdFx0dmFyIHBlcmNlbnREb25lID0gTWF0aC5taW4oIDEwMCwgTWF0aC5jZWlsKCAxMDAgKiAoIGl0ZW0udHJhbnNmZXJyZWQgLyBpdGVtLnNpemUgKSApICk7XG5cdFx0aXRlbS4kcHJvZ3Jlc3MuY3NzKCAnd2lkdGgnLCBwZXJjZW50RG9uZSArICclJyApO1xuXHRcdGlmICggMTAwIDw9IHBlcmNlbnREb25lICkge1xuXHRcdFx0dGhpcy5lbGVtQ29tcGxldGUoIGl0ZW0gKTtcblx0XHR9XG5cdH0sXG5cdGVsZW1Db21wbGV0ZTogZnVuY3Rpb24oIGl0ZW0gKSB7XG5cdFx0dmFyICRlbCA9IGl0ZW0uJGVsLmFkZENsYXNzKCAnY29tcGxldGUnICk7XG5cdFx0dmFyICRuZXh0RWwgID0gdGhpcy5nZXROZXh0RWxlbWVudEZvclZpZXcoICRlbCApO1xuXG5cdFx0dmFyIGhlaWdodCA9ICRlbC5oZWlnaHQoKTtcblx0XHR2YXIgbWFyZ2luQm90dG9tID0gJGVsLmNzcyggJ21hcmdpbi1ib3R0b20nICk7XG5cblx0XHR2YXIgJGNsb25lID0gJG5leHRFbC5jbG9uZSgpLmNzcyggeyBoZWlnaHQ6IDAsIG1hcmdpbkJvdHRvbTogMCB9ICkuYWRkQ2xhc3MoICdjbG9uZScgKTtcblx0XHQkY2xvbmUuYXBwZW5kVG8oIHRoaXMuJGl0ZW1zQ29udGFpbmVyICk7XG5cdFx0JGVsLmNzcyggeyBoZWlnaHQ6IGhlaWdodCwgbWFyZ2luQm90dG9tOiBtYXJnaW5Cb3R0b20gfSApO1xuXG5cdFx0c2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHQkZWwuY3NzKCB7IGhlaWdodDogMCwgbWFyZ2luQm90dG9tOiAwIH0gKTtcblx0XHRcdCRjbG9uZS5jc3MoIHsgaGVpZ2h0OiBoZWlnaHQsIG1hcmdpbkJvdHRvbTogbWFyZ2luQm90dG9tIH0gKTtcblxuXHRcdFx0c2V0VGltZW91dCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCRlbC5jc3MoIHsgaGVpZ2h0OiAnYXV0bycsIG1hcmdpbkJvdHRvbTogbWFyZ2luQm90dG9tIH0gKS5yZW1vdmUoKTtcblx0XHRcdFx0JGNsb25lLnJlbW92ZSgpO1xuXHRcdFx0XHR0aGlzLiRpdGVtc0NvbnRhaW5lci5maW5kKCAnLml0ZW0tcHJvZ3Jlc3M6bm90KC5jbG9uZSknICkubGFzdCgpLmFmdGVyKCAkbmV4dEVsLmNzcyggeyBoZWlnaHQ6ICdhdXRvJywgbWFyZ2luQm90dG9tOiBtYXJnaW5Cb3R0b20gfSApICk7XG5cdFx0XHR9LmJpbmQoIHRoaXMgKSwgMjUwICk7XG5cblx0XHR9LmJpbmQoIHRoaXMgKSwgMTAwMCApO1xuXG5cdH1cbn0gKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlVmlldztcbiIsIihmdW5jdGlvbiggJCwgd3BtZGIgKSB7XG5cblx0dmFyIGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSBmYWxzZTtcblx0dmFyIGxhc3RfcmVwbGFjZV9zd2l0Y2ggPSAnJztcblx0dmFyIGRvaW5nX2FqYXggPSBmYWxzZTtcblx0dmFyIGRvaW5nX2xpY2VuY2VfcmVnaXN0cmF0aW9uX2FqYXggPSBmYWxzZTtcblx0dmFyIGRvaW5nX3Jlc2V0X2FwaV9rZXlfYWpheCA9IGZhbHNlO1xuXHR2YXIgZG9pbmdfc2F2ZV9wcm9maWxlID0gZmFsc2U7XG5cdHZhciBkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ID0gZmFsc2U7XG5cdHZhciBwcm9maWxlX25hbWVfZWRpdGVkID0gZmFsc2U7XG5cdHZhciBjaGVja2VkX2xpY2VuY2UgPSBmYWxzZTtcblx0dmFyIHNob3dfcHJlZml4X25vdGljZSA9IGZhbHNlO1xuXHR2YXIgc2hvd19zc2xfbm90aWNlID0gZmFsc2U7XG5cdHZhciBzaG93X3ZlcnNpb25fbm90aWNlID0gZmFsc2U7XG5cdHZhciBtaWdyYXRpb25fY29tcGxldGVkID0gZmFsc2U7XG5cdHZhciBjdXJyZW50bHlfbWlncmF0aW5nID0gZmFsc2U7XG5cdHZhciBkdW1wX2ZpbGVuYW1lID0gJyc7XG5cdHZhciBkdW1wX3BhdGggPSAnJztcblx0dmFyIG1pZ3JhdGlvbl9pbnRlbnQ7XG5cdHZhciByZW1vdGVfc2l0ZTtcblx0dmFyIHNlY3JldF9rZXk7XG5cdHZhciBmb3JtX2RhdGE7XG5cdHZhciBzdGFnZTtcblx0dmFyIGVsYXBzZWRfaW50ZXJ2YWw7XG5cdHZhciBjb21wbGV0ZWRfbXNnO1xuXHR2YXIgdGFibGVzX3RvX21pZ3JhdGUgPSAnJztcblx0dmFyIG1pZ3JhdGlvbl9wYXVzZWQgPSBmYWxzZTtcblx0dmFyIHByZXZpb3VzX3Byb2dyZXNzX3RpdGxlID0gJyc7XG5cdHZhciBwcmV2aW91c19wcm9ncmVzc190ZXh0X3ByaW1hcnkgPSAnJztcblx0dmFyIHByZXZpb3VzX3Byb2dyZXNzX3RleHRfc2Vjb25kYXJ5ID0gJyc7XG5cdHZhciBtaWdyYXRpb25fY2FuY2VsbGVkID0gZmFsc2U7XG5cdHZhciBmbGFnX3NraXBfZGVsYXkgPSBmYWxzZTtcblx0dmFyIGRlbGF5X2JldHdlZW5fcmVxdWVzdHMgPSAwO1xuXHR2YXIgZmFkZV9kdXJhdGlvbiA9IDQwMDtcblx0dmFyIHBhdXNlX2JlZm9yZV9maW5hbGl6ZSA9IGZhbHNlO1xuXHR2YXIgaXNfYXV0b19wYXVzZV9iZWZvcmVfZmluYWxpemUgPSBmYWxzZTtcblxuXHR3cG1kYi5taWdyYXRpb25fcHJvZ3Jlc3NfY29udHJvbGxlciA9IHJlcXVpcmUoICdNaWdyYXRpb25Qcm9ncmVzcy1jb250cm9sbGVyJyApO1xuXHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbiA9IG51bGw7XG5cblx0dmFyIGFkbWluX3VybCA9IGFqYXh1cmwucmVwbGFjZSggJy9hZG1pbi1hamF4LnBocCcsICcnICksIHNwaW5uZXJfdXJsID0gYWRtaW5fdXJsICsgJy9pbWFnZXMvc3Bpbm5lcic7XG5cblx0aWYgKCAyIDwgd2luZG93LmRldmljZVBpeGVsUmF0aW8gKSB7XG5cdFx0c3Bpbm5lcl91cmwgKz0gJy0yeCc7XG5cdH1cblx0c3Bpbm5lcl91cmwgKz0gJy5naWYnO1xuXHR2YXIgYWpheF9zcGlubmVyID0gJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwiYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JztcblxuXHR3aW5kb3cub25iZWZvcmV1bmxvYWQgPSBmdW5jdGlvbiggZSApIHtcblx0XHRpZiAoIGN1cnJlbnRseV9taWdyYXRpbmcgKSB7XG5cdFx0XHRlID0gZSB8fCB3aW5kb3cuZXZlbnQ7XG5cblx0XHRcdC8vIEZvciBJRSBhbmQgRmlyZWZveCBwcmlvciB0byB2ZXJzaW9uIDRcblx0XHRcdGlmICggZSApIHtcblx0XHRcdFx0ZS5yZXR1cm5WYWx1ZSA9IHdwbWRiX3N0cmluZ3Muc3VyZTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gRm9yIFNhZmFyaVxuXHRcdFx0cmV0dXJuIHdwbWRiX3N0cmluZ3Muc3VyZTtcblx0XHR9XG5cdH07XG5cblx0ZnVuY3Rpb24gcGFkKCBuLCB3aWR0aCwgeiApIHtcblx0XHR6ID0geiB8fCAnMCc7XG5cdFx0biA9IG4gKyAnJztcblx0XHRyZXR1cm4gbi5sZW5ndGggPj0gd2lkdGggPyBuIDogbmV3IEFycmF5KCB3aWR0aCAtIG4ubGVuZ3RoICsgMSApLmpvaW4oIHogKSArIG47XG5cdH1cblxuXHRmdW5jdGlvbiBpc19pbnQoIG4gKSB7XG5cdFx0biA9IHBhcnNlSW50KCBuICk7XG5cdFx0cmV0dXJuICdudW1iZXInID09PSB0eXBlb2YgbiAmJiAwID09PSBuICUgMTtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldF9pbnRlcnNlY3QoIGFycjEsIGFycjIgKSB7XG5cdFx0dmFyIHIgPSBbXSwgbyA9IHt9LCBsID0gYXJyMi5sZW5ndGgsIGksIHY7XG5cdFx0Zm9yICggaSA9IDA7IGkgPCBsOyBpKysgKSB7XG5cdFx0XHRvWyBhcnIyWyBpIF0gXSA9IHRydWU7XG5cdFx0fVxuXHRcdGwgPSBhcnIxLmxlbmd0aDtcblx0XHRmb3IgKCBpID0gMDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdHYgPSBhcnIxWyBpIF07XG5cdFx0XHRpZiAoIHYgaW4gbyApIHtcblx0XHRcdFx0ci5wdXNoKCB2ICk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHJldHVybiByO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0X3F1ZXJ5X3ZhciggbmFtZSApIHtcblx0XHRuYW1lID0gbmFtZS5yZXBsYWNlKCAvW1xcW10vLCAnXFxcXFsnICkucmVwbGFjZSggL1tcXF1dLywgJ1xcXFxdJyApO1xuXHRcdHZhciByZWdleCA9IG5ldyBSZWdFeHAoICdbXFxcXD8mXScgKyBuYW1lICsgJz0oW14mI10qKScgKSxcblx0XHRcdHJlc3VsdHMgPSByZWdleC5leGVjKCBsb2NhdGlvbi5zZWFyY2ggKTtcblx0XHRyZXR1cm4gbnVsbCA9PT0gcmVzdWx0cyA/ICcnIDogZGVjb2RlVVJJQ29tcG9uZW50KCByZXN1bHRzWyAxIF0ucmVwbGFjZSggL1xcKy9nLCAnICcgKSApO1xuXHR9XG5cblx0ZnVuY3Rpb24gbWF5YmVfc2hvd19zc2xfd2FybmluZyggdXJsLCBrZXksIHJlbW90ZV9zY2hlbWUgKSB7XG5cdFx0dmFyIHNjaGVtZSA9IHVybC5zdWJzdHIoIDAsIHVybC5pbmRleE9mKCAnOicgKSApO1xuXHRcdGlmICggcmVtb3RlX3NjaGVtZSAhPT0gc2NoZW1lICYmIHVybC5pbmRleE9mKCAnaHR0cHMnICkgIT09IC0xICkge1xuXHRcdFx0JCggJy5zc2wtbm90aWNlJyApLnNob3coKTtcblx0XHRcdHNob3dfc3NsX25vdGljZSA9IHRydWU7XG5cdFx0XHR1cmwgPSB1cmwucmVwbGFjZSggJ2h0dHBzJywgJ2h0dHAnICk7XG5cdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCB1cmwgKyAnXFxuJyArIGtleSApO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblx0XHRzaG93X3NzbF9ub3RpY2UgPSBmYWxzZTtcblx0XHRyZXR1cm47XG5cdH1cblxuXHRmdW5jdGlvbiBtYXliZV9zaG93X3ByZWZpeF9ub3RpY2UoIHByZWZpeCApIHtcblx0XHRpZiAoIHByZWZpeCAhPT0gd3BtZGJfZGF0YS50aGlzX3ByZWZpeCApIHtcblx0XHRcdCQoICcucmVtb3RlLXByZWZpeCcgKS5odG1sKCBwcmVmaXggKTtcblx0XHRcdHNob3dfcHJlZml4X25vdGljZSA9IHRydWU7XG5cdFx0XHRpZiAoICdwdWxsJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSApIHtcblx0XHRcdFx0JCggJy5wcmVmaXgtbm90aWNlLnB1bGwnICkuc2hvdygpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JCggJy5wcmVmaXgtbm90aWNlLnB1c2gnICkuc2hvdygpO1xuXHRcdFx0fVxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCkge1xuXHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhIHx8IGZhbHNlID09PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBtaWdyYXRpb25faW50ZW50ID0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKTtcblx0XHR2YXIgdGFibGVzX3RvX21pZ3JhdGUgPSBnZXRfdGFibGVzX3RvX21pZ3JhdGUoIG51bGwsIG51bGwgKTtcblxuXHRcdCQoICcubWl4ZWQtY2FzZS10YWJsZS1uYW1lLW5vdGljZScgKS5oaWRlKCk7XG5cblx0XHRpZiAoIG51bGwgPT09IHRhYmxlc190b19taWdyYXRlICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHRhYmxlc190b19taWdyYXRlID0gdGFibGVzX3RvX21pZ3JhdGUuam9pbiggJycgKTtcblxuXHRcdC8vIFRoZSB0YWJsZSBuYW1lcyBhcmUgYWxsIGxvd2VyY2FzZSwgbm8gbmVlZCB0byBkaXNwbGF5IHRoZSB3YXJuaW5nLlxuXHRcdGlmICggdGFibGVzX3RvX21pZ3JhdGUgPT09IHRhYmxlc190b19taWdyYXRlLnRvTG93ZXJDYXNlKCkgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQgKiBEbyBub3QgZGlzcGxheSB0aGUgd2FybmluZyBpZiB0aGUgcmVtb3RlIGxvd2VyX2Nhc2VfdGFibGVfbmFtZXMgZG9lcyBub3QgZXF1YWwgXCIxXCIgKGkuZSB0aGUgb25seSBwcm9ibGVtYXRpYyBzZXR0aW5nKVxuXHRcdCAqIEFwcGxpZXMgdG8gcHVzaC9leHBvcnQgbWlncmF0aW9ucy5cblx0XHQgKi9cblx0XHRpZiAoICcxJyAhPT0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5sb3dlcl9jYXNlX3RhYmxlX25hbWVzICYmICggJ3B1c2gnID09PSBtaWdyYXRpb25faW50ZW50IHx8ICdzYXZlZmlsZScgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCAqIERvIG5vdCBkaXNwbGF5IHRoZSB3YXJuaW5nIGlmIHRoZSBsb2NhbCBsb3dlcl9jYXNlX3RhYmxlX25hbWVzIGRvZXMgbm90IGVxdWFsIFwiMVwiIChpLmUgdGhlIG9ubHkgcHJvYmxlbWF0aWMgc2V0dGluZylcblx0XHQgKiBPbmx5IGFwcGxpZXMgdG8gcHVsbCBtaWdyYXRpb25zLlxuXHRcdCAqL1xuXHRcdGlmICggJzEnICE9PSB3cG1kYl9kYXRhLmxvd2VyX2Nhc2VfdGFibGVfbmFtZXMgJiYgJ3B1bGwnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0ICogQXQgdGhpcyBzdGFnZSB3ZSd2ZSBkZXRlcm1pbmVkOlxuXHRcdCAqIDEuIFRoZSBzb3VyY2UgZGF0YWJhc2UgY29udGFpbnMgYXQgbGVhc3Qgb25lIHRhYmxlIHRoYXQgY29udGFpbnMgYW4gdXBwZXJjYXNlIGNoYXJhY3Rlci5cblx0XHQgKiAyLiBUaGUgZGVzdGluYXRpb24gZW52aXJvbm1lbnQgaGFzIGxvd2VyX2Nhc2VfdGFibGVfbmFtZXMgc2V0IHRvIDEuXG5cdFx0ICogMy4gVGhlIHNvdXJjZSBkYXRhYmFzZSB0YWJsZSBjb250YWluaW5nIHRoZSB1cHBlcmNhc2UgbGV0dGVyIHdpbGwgYmUgY29udmVydGVkIHRvIGxvd2VyY2FzZSBkdXJpbmcgdGhlIG1pZ3JhdGlvbi5cblx0XHQgKi9cblxuXHRcdGlmICggJ3B1c2gnID09PSBtaWdyYXRpb25faW50ZW50IHx8ICdzYXZlZmlsZScgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHQkKCAnLm1peGVkLWNhc2UtdGFibGUtbmFtZS1ub3RpY2UucHVzaCcgKS5zaG93KCk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcubWl4ZWQtY2FzZS10YWJsZS1uYW1lLW5vdGljZS5wdWxsJyApLnNob3coKTtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRfZG9tYWluX25hbWUoIHVybCApIHtcblx0XHR2YXIgdGVtcF91cmwgPSB1cmw7XG5cdFx0dmFyIGRvbWFpbiA9IHRlbXBfdXJsLnJlcGxhY2UoIC9cXC9cXC8oLiopQC8sICcvLycgKS5yZXBsYWNlKCAnaHR0cDovLycsICcnICkucmVwbGFjZSggJ2h0dHBzOi8vJywgJycgKS5yZXBsYWNlKCAnd3d3LicsICcnICk7XG5cdFx0cmV0dXJuIGRvbWFpbjtcblx0fVxuXG5cdGZ1bmN0aW9uIGdldF9taWdyYXRpb25fc3RhdHVzX2xhYmVsKCB1cmwsIGludGVudCwgc3RhZ2UgKSB7XG5cdFx0dmFyIGRvbWFpbiA9IGdldF9kb21haW5fbmFtZSggdXJsICk7XG5cdFx0dmFyIG1pZ3JhdGluZ19zdGFnZV9sYWJlbCwgY29tcGxldGVkX3N0YWdlX2xhYmVsO1xuXHRcdGlmICggJ3B1bGwnID09PSBpbnRlbnQgKSB7XG5cdFx0XHRtaWdyYXRpbmdfc3RhZ2VfbGFiZWwgPSB3cG1kYl9zdHJpbmdzLnB1bGxfbWlncmF0aW9uX2xhYmVsX21pZ3JhdGluZztcblx0XHRcdGNvbXBsZXRlZF9zdGFnZV9sYWJlbCA9IHdwbWRiX3N0cmluZ3MucHVsbF9taWdyYXRpb25fbGFiZWxfY29tcGxldGVkO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtaWdyYXRpbmdfc3RhZ2VfbGFiZWwgPSB3cG1kYl9zdHJpbmdzLnB1c2hfbWlncmF0aW9uX2xhYmVsX21pZ3JhdGluZztcblx0XHRcdGNvbXBsZXRlZF9zdGFnZV9sYWJlbCA9IHdwbWRiX3N0cmluZ3MucHVzaF9taWdyYXRpb25fbGFiZWxfY29tcGxldGVkO1xuXHRcdH1cblxuXHRcdG1pZ3JhdGluZ19zdGFnZV9sYWJlbCA9IG1pZ3JhdGluZ19zdGFnZV9sYWJlbC5yZXBsYWNlKCAvXFwlcyhcXFMqKVxccz8vLCAnPHNwYW4gY2xhc3M9ZG9tYWluLWxhYmVsPicgKyBkb21haW4gKyAnJDE8L3NwYW4+Jm5ic3A7JyApO1xuXHRcdGNvbXBsZXRlZF9zdGFnZV9sYWJlbCA9IGNvbXBsZXRlZF9zdGFnZV9sYWJlbC5yZXBsYWNlKCAvXFwlc1xccz8vLCAnPHNwYW4gY2xhc3M9ZG9tYWluLWxhYmVsPicgKyBkb21haW4gKyAnPC9zcGFuPiZuYnNwOycgKTtcblxuXHRcdGlmICggJ21pZ3JhdGluZycgPT09IHN0YWdlICkge1xuXHRcdFx0cmV0dXJuIG1pZ3JhdGluZ19zdGFnZV9sYWJlbDtcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGNvbXBsZXRlZF9zdGFnZV9sYWJlbDtcblx0XHR9XG5cdH1cblxuXHRmdW5jdGlvbiByZW1vdmVfcHJvdG9jb2woIHVybCApIHtcblx0XHRyZXR1cm4gdXJsLnJlcGxhY2UoIC9eaHR0cHM/Oi9pLCAnJyApO1xuXHR9XG5cblx0ZnVuY3Rpb24gZGlzYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpIHtcblx0XHQkKCAnLm9wdGlvbi1ncm91cCcgKS5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0XHQkKCAnaW5wdXQnLCB0aGlzICkuYXR0ciggJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyApO1xuXHRcdFx0JCggJ2xhYmVsJywgdGhpcyApLmNzcyggJ2N1cnNvcicsICdkZWZhdWx0JyApO1xuXHRcdH0gKTtcblx0fVxuXG5cdGZ1bmN0aW9uIGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpIHtcblx0XHQkKCAnLm9wdGlvbi1ncm91cCcgKS5lYWNoKCBmdW5jdGlvbiggaW5kZXggKSB7XG5cdFx0XHQkKCAnaW5wdXQnLCB0aGlzICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdFx0JCggJ2xhYmVsJywgdGhpcyApLmNzcyggJ2N1cnNvcicsICdwb2ludGVyJyApO1xuXHRcdH0gKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldF9zbGlkZXJfdmFsdWUoIHBhcmVudF9zZWxlY3RvciwgdmFsdWUsIHVuaXQsIGRpc3BsYXkgKSB7XG5cdFx0dmFyIGRpc3BsYXlfdmFsdWUgPSB2YWx1ZTtcblxuXHRcdGlmICggdW5kZWZpbmVkICE9PSBkaXNwbGF5ICkge1xuXHRcdFx0ZGlzcGxheV92YWx1ZSA9IGRpc3BsYXk7XG5cdFx0fVxuXG5cdFx0JCggJy5zbGlkZXInLCBwYXJlbnRfc2VsZWN0b3IgKS5zbGlkZXIoICd2YWx1ZScsIHBhcnNlSW50KCB2YWx1ZSApICk7XG5cdFx0JCggJy5hbW91bnQnLCBwYXJlbnRfc2VsZWN0b3IgKS5odG1sKCB3cG1kYl9hZGRfY29tbWFzKCBkaXNwbGF5X3ZhbHVlICkgKyAnICcgKyB1bml0ICk7XG5cdH1cblxuXHRmdW5jdGlvbiBzZXRfcGF1c2VfcmVzdW1lX2J1dHRvbiggZXZlbnQgKSB7XG5cdFx0aWYgKCB0cnVlID09PSBtaWdyYXRpb25fcGF1c2VkICkge1xuXHRcdFx0bWlncmF0aW9uX3BhdXNlZCA9IGZhbHNlO1xuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBwcmV2aW91c19wcm9ncmVzc190aXRsZSwgcHJldmlvdXNfcHJvZ3Jlc3NfdGV4dF9wcmltYXJ5LCAnYWN0aXZlJyApO1xuXHRcdFx0JCggJy5wYXVzZS1yZXN1bWUnICkuaHRtbCggd3BtZGJfc3RyaW5ncy5wYXVzZSApO1xuXG5cdFx0XHQvLyBSZXN1bWUgdGhlIHRpbWVyXG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5yZXN1bWVUaW1lcigpO1xuXG5cdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0bWlncmF0aW9uX3BhdXNlZCA9IHRydWU7XG5cdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRwcmV2aW91c19wcm9ncmVzc190aXRsZSA9ICQoICcucHJvZ3Jlc3MtdGl0bGUnICkuaHRtbCgpO1xuXHRcdFx0cHJldmlvdXNfcHJvZ3Jlc3NfdGV4dF9wcmltYXJ5ID0gJCggJy5wcm9ncmVzcy10ZXh0JywgJy5wcm9ncmVzcy13cmFwcGVyLXByaW1hcnknICkuaHRtbCgpO1xuXHRcdFx0cHJldmlvdXNfcHJvZ3Jlc3NfdGV4dF9zZWNvbmRhcnkgPSAkKCAnLnByb2dyZXNzLXRleHQnLCAnLnByb2dyZXNzLXdyYXBwZXItc2Vjb25kYXJ5ICcgKS5odG1sKCk7XG5cblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9wYXVzZWQsIHdwbWRiX3N0cmluZ3MuY29tcGxldGluZ19jdXJyZW50X3JlcXVlc3QsIG51bGwgKTtcblx0XHRcdCQoICdib2R5JyApLm9mZiggJ2NsaWNrJywgJy5wYXVzZS1yZXN1bWUnICk7IC8vIElzIHJlLWJvdW5kIGF0IGV4ZWN1dGVfbmV4dF9zdGVwIHdoZW4gbWlncmF0aW9uIGlzIGZpbmFsbHkgcGF1c2VkXG5cdFx0XHQkKCAnYm9keScgKS5vZmYoICdjbGljaycsICcuY2FuY2VsJyApOyAvLyBJcyByZS1ib3VuZCBhdCBleGVjdXRlX25leHRfc3RlcCB3aGVuIG1pZ3JhdGlvbiBpcyBmaW5hbGx5IHBhdXNlZFxuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGNyZWF0ZV90YWJsZV9zZWxlY3QoIHRhYmxlcywgdGFibGVfc2l6ZXNfaHIsIHNlbGVjdGVkX3RhYmxlcyApIHtcblx0XHR2YXIgJHRhYmxlX3NlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdzZWxlY3QnICk7XG5cdFx0JCggJHRhYmxlX3NlbGVjdCApLmF0dHIoIHtcblx0XHRcdG11bHRpcGxlOiAnbXVsdGlwbGUnLFxuXHRcdFx0bmFtZTogJ3NlbGVjdF90YWJsZXNbXScsXG5cdFx0XHRpZDogJ3NlbGVjdC10YWJsZXMnLFxuXHRcdFx0Y2xhc3M6ICdtdWx0aXNlbGVjdCdcblx0XHR9ICk7XG5cblx0XHRpZiAoIDAgPCB0YWJsZXMubGVuZ3RoICkge1xuXHRcdFx0JC5lYWNoKCB0YWJsZXMsIGZ1bmN0aW9uKCBpbmRleCwgdGFibGUgKSB7XG5cdFx0XHRcdGlmICggJC53cG1kYi5hcHBseV9maWx0ZXJzKCAnd3BtZGJfZXhjbHVkZV90YWJsZScsIGZhbHNlLCB0YWJsZSApICkge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHZhciBzZWxlY3RlZCA9ICcgJztcblx0XHRcdFx0aWYgKCB1bmRlZmluZWQgIT09IHNlbGVjdGVkX3RhYmxlcyAmJiBudWxsICE9PSBzZWxlY3RlZF90YWJsZXMgJiYgMCA8IHNlbGVjdGVkX3RhYmxlcy5sZW5ndGggJiYgLTEgIT09ICQuaW5BcnJheSggdGFibGUsIHNlbGVjdGVkX3RhYmxlcyApICkge1xuXHRcdFx0XHRcdHNlbGVjdGVkID0gJyBzZWxlY3RlZD1cInNlbGVjdGVkXCIgJztcblx0XHRcdFx0fVxuXHRcdFx0XHQkKCAkdGFibGVfc2VsZWN0ICkuYXBwZW5kKCAnPG9wdGlvbicgKyBzZWxlY3RlZCArICd2YWx1ZT1cIicgKyB0YWJsZSArICdcIj4nICsgdGFibGUgKyAnICgnICsgdGFibGVfc2l6ZXNfaHJbIHRhYmxlIF0gKyAnKTwvb3B0aW9uPicgKTtcblx0XHRcdH0gKTtcblx0XHR9XG5cblx0XHRyZXR1cm4gJHRhYmxlX3NlbGVjdDtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIHRhYmxlcyBzZWxlY3RlZCBmb3IgbWlncmF0aW9uLlxuXHQgKlxuXHQgKiBAcGFyYW0gdmFsdWVcblx0ICogQHBhcmFtIGFyZ3Ncblx0ICogQHJldHVybnMge3N0cmluZ31cblx0ICpcblx0ICogQWxzbyBoYW5kbGVyIGZvciB3cG1kYl9nZXRfdGFibGVzX3RvX21pZ3JhdGUgZmlsdGVyLCBkaXNyZWdhcmRzIGlucHV0IHZhbHVlcyBhcyBpdCBpcyB0aGUgcHJpbWFyeSBzb3VyY2UuXG5cdCAqL1xuXHRmdW5jdGlvbiBnZXRfdGFibGVzX3RvX21pZ3JhdGUoIHZhbHVlLCBhcmdzICkge1xuXHRcdHZhciB0YWJsZXMgPSAnJztcblx0XHR2YXIgbWlnX3R5cGUgPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXHRcdHZhciB0YWJsZV9pbnRlbnQgPSAkKCAnaW5wdXRbbmFtZT10YWJsZV9taWdyYXRlX29wdGlvbl06Y2hlY2tlZCcgKS52YWwoKTtcblxuXHRcdC8vIEdyYWIgdGFibGVzIGFzIHBlciB3aGF0IHRoZSB1c2VyIGhhcyBzZWxlY3RlZCBmcm9tIHRoZSBtdWx0aXNlbGVjdCBib3ggb3IgYWxsIHByZWZpeGVkIHRhYmxlcy5cblx0XHRpZiAoICdtaWdyYXRlX3NlbGVjdCcgPT09IHRhYmxlX2ludGVudCApIHtcblx0XHRcdHRhYmxlcyA9ICQoICcjc2VsZWN0LXRhYmxlcycgKS52YWwoKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0aWYgKCAncHVsbCcgIT09IG1pZ190eXBlICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGJfZGF0YS50aGlzX3ByZWZpeGVkX3RhYmxlcyApIHtcblx0XHRcdFx0dGFibGVzID0gd3BtZGJfZGF0YS50aGlzX3ByZWZpeGVkX3RhYmxlcztcblx0XHRcdH1cblx0XHRcdGlmICggJ3B1bGwnID09PSBtaWdfdHlwZSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnByZWZpeGVkX3RhYmxlcyApIHtcblx0XHRcdFx0dGFibGVzID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wcmVmaXhlZF90YWJsZXM7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0cmV0dXJuIHRhYmxlcztcblx0fVxuXG5cdGZ1bmN0aW9uIGdldF90YWJsZV9wcmVmaXgoIHZhbHVlLCBhcmdzICkge1xuXHRcdHJldHVybiAkKCAnLnRhYmxlLXNlbGVjdC13cmFwIC50YWJsZS1wcmVmaXgnICkudGV4dCgpO1xuXHR9XG5cblx0ZnVuY3Rpb24gbG9ja19yZXBsYWNlX3VybCggbG9jayApIHtcblx0XHRpZiAoIHRydWUgPT09IGxvY2sgKSB7XG5cdFx0XHQkKCAnLnJlcGxhY2Utcm93LnBpbiAucmVwbGFjZS1yaWdodC1jb2wgaW5wdXRbdHlwZT1cInRleHRcIl0nICkuYXR0ciggJ3JlYWRvbmx5JywgJ3JlYWRvbmx5JyApO1xuXHRcdFx0JCggJy5yZXBsYWNlLXJvdy5waW4gLmFycm93LWNvbCcgKS5hZGRDbGFzcyggJ2Rpc2FibGVkJyApO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHQkKCAnLnJlcGxhY2Utcm93LnBpbiAucmVwbGFjZS1yaWdodC1jb2wgaW5wdXRbdHlwZT1cInRleHRcIl0nICkucmVtb3ZlQXR0ciggJ3JlYWRvbmx5JyApO1xuXHRcdFx0JCggJy5yZXBsYWNlLXJvdy5waW4gLmFycm93LWNvbCcgKS5yZW1vdmVDbGFzcyggJ2Rpc2FibGVkJyApO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHNldF9jb25uZWN0aW9uX2RhdGEoIGRhdGEgKSB7XG5cdFx0d3BtZGIuY29tbW9uLnByZXZpb3VzX2Nvbm5lY3Rpb25fZGF0YSA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGE7XG5cdFx0d3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSA9IGRhdGE7XG5cdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl9jb25uZWN0aW9uX2RhdGFfdXBkYXRlZCcsIGRhdGEgKTtcblx0fVxuXG5cdC8qKlxuXHQgKiBSZXR1cm5zIGZvcm1hdHRlZCBpbmZvIGZvciB0aGUgTWF4IFJlcXVlc3QgU2l6ZSBzbGlkZXIuXG5cdCAqXG5cdCAqIEBwYXJhbSB2YWx1ZVxuXHQgKiBAcmV0dXJuIG9iamVjdFxuXHQgKi9cblx0ZnVuY3Rpb24gZ2V0X21heF9yZXF1ZXN0X2Rpc3BsYXlfaW5mbyggdmFsdWUgKSB7XG5cdFx0dmFyIGRpc3BsYXlfaW5mbyA9IHt9O1xuXG5cdFx0ZGlzcGxheV9pbmZvLnVuaXQgPSAnTUInO1xuXHRcdGRpc3BsYXlfaW5mby5hbW91bnQgPSAoIHZhbHVlIC8gMTAyNCApLnRvRml4ZWQoIDIgKTtcblxuXHRcdHJldHVybiBkaXNwbGF5X2luZm87XG5cdH1cblxuXHQkKCBkb2N1bWVudCApLnJlYWR5KCBmdW5jdGlvbigpIHtcblx0XHR3cG1kYi5taWdyYXRpb25fc3RhdGVfaWQgPSAnJztcblxuXHRcdCQoICcjcGx1Z2luLWNvbXBhdGliaWxpdHknICkuY2hhbmdlKCBmdW5jdGlvbiggZSApIHtcblx0XHRcdHZhciBpbnN0YWxsID0gJzEnO1xuXHRcdFx0dmFyICRzdGF0dXMgPSAkKCB0aGlzICkuY2xvc2VzdCggJ3RkJyApLm5leHQoICd0ZCcgKS5maW5kKCAnLnNldHRpbmctc3RhdHVzJyApO1xuXG5cdFx0XHRpZiAoICQoIHRoaXMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHR2YXIgYW5zd2VyID0gY29uZmlybSggd3BtZGJfc3RyaW5ncy5tdV9wbHVnaW5fY29uZmlybWF0aW9uICk7XG5cblx0XHRcdFx0aWYgKCAhYW5zd2VyICkge1xuXHRcdFx0XHRcdCQoIHRoaXMgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRpbnN0YWxsID0gJzAnO1xuXHRcdFx0fVxuXG5cdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXdyYXAnICkudG9nZ2xlKCk7XG5cblx0XHRcdCRzdGF0dXMuZmluZCggJy5hamF4LXN1Y2Nlc3MtbXNnJyApLnJlbW92ZSgpO1xuXHRcdFx0JHN0YXR1cy5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0JCggJyNwbHVnaW4tY29tcGF0aWJpbGl0eScgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnICk7XG5cdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5JyApLmFkZENsYXNzKCAnZGlzYWJsZWQnICk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfcGx1Z2luX2NvbXBhdGliaWxpdHknLFxuXHRcdFx0XHRcdGluc3RhbGw6IGluc3RhbGxcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MucGx1Z2luX2NvbXBhdGliaWxpdHlfc2V0dGluZ3NfcHJvYmxlbSArICdcXHJcXG5cXHJcXG4nICsgd3BtZGJfc3RyaW5ncy5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJ1xcclxcblxcclxcbicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJ1xcclxcbicgKyBqcVhIUi5yZXNwb25zZVRleHQgKTtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHQkKCAnI3BsdWdpbi1jb21wYXRpYmlsaXR5JyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5JyApLnJlbW92ZUNsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdGlmICggJycgIT09ICQudHJpbSggZGF0YSApICkge1xuXHRcdFx0XHRcdFx0YWxlcnQoIGRhdGEgKTtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0JHN0YXR1cy5hcHBlbmQoICc8c3BhbiBjbGFzcz1cImFqYXgtc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdFx0JCggJy5hamF4LXN1Y2Nlc3MtbXNnJyApLmZhZGVPdXQoIDIwMDAsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcjcGx1Z2luLWNvbXBhdGliaWxpdHknICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHknICkucmVtb3ZlQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0fSApO1xuXG5cdFx0aWYgKCAkKCAnI3BsdWdpbi1jb21wYXRpYmlsaXR5JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXdyYXAnICkuc2hvdygpO1xuXHRcdH1cblxuXHRcdGlmICggMCA8PSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoICdNU0lFJyApIHx8IDAgPD0gbmF2aWdhdG9yLnVzZXJBZ2VudC5pbmRleE9mKCAnVHJpZGVudCcgKSApIHtcblx0XHRcdCQoICcuaWUtd2FybmluZycgKS5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwID09PSB3cG1kYl9kYXRhLnZhbGlkX2xpY2VuY2UgKSB7XG5cdFx0XHQkKCAnI3NhdmVmaWxlJyApLnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXHRcdH1cblx0XHR2YXIgbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIgPSAkKCAnLm1heC1yZXF1ZXN0LXNpemUnICk7XG5cdFx0dmFyIG1heF9yZXF1ZXN0X3NpemVfc2xpZGVyID0gJCggJy5zbGlkZXInLCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciApO1xuXHRcdG1heF9yZXF1ZXN0X3NpemVfc2xpZGVyLnNsaWRlcigge1xuXHRcdFx0cmFuZ2U6ICdtaW4nLFxuXHRcdFx0dmFsdWU6IHBhcnNlSW50KCB3cG1kYl9kYXRhLm1heF9yZXF1ZXN0IC8gMTAyNCApLFxuXHRcdFx0bWluOiA1MTIsXG5cdFx0XHRtYXg6IHBhcnNlSW50KCB3cG1kYl9kYXRhLmJvdHRsZW5lY2sgLyAxMDI0ICksXG5cdFx0XHRzdGVwOiAyNTYsXG5cdFx0XHRjcmVhdGU6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG5cdFx0XHRcdHZhciBkaXNwbGF5X2luZm8gPSBnZXRfbWF4X3JlcXVlc3RfZGlzcGxheV9pbmZvKCB3cG1kYl9kYXRhLm1heF9yZXF1ZXN0IC8gMTAyNCApO1xuXHRcdFx0XHRzZXRfc2xpZGVyX3ZhbHVlKCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciwgd3BtZGJfZGF0YS5tYXhfcmVxdWVzdCAvIDEwMjQsIGRpc3BsYXlfaW5mby51bml0LCBkaXNwbGF5X2luZm8uYW1vdW50ICk7XG5cdFx0XHR9LFxuXHRcdFx0c2xpZGU6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG5cdFx0XHRcdHZhciBkaXNwbGF5X2luZm8gPSBnZXRfbWF4X3JlcXVlc3RfZGlzcGxheV9pbmZvKCB1aS52YWx1ZSApO1xuXHRcdFx0XHRzZXRfc2xpZGVyX3ZhbHVlKCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciwgdWkudmFsdWUsIGRpc3BsYXlfaW5mby51bml0LCBkaXNwbGF5X2luZm8uYW1vdW50ICk7XG5cdFx0XHR9LFxuXHRcdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0JCggJy5zbGlkZXItc3VjY2Vzcy1tc2cnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuYW1vdW50JywgbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIgKS5hZnRlciggJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwic2xpZGVyLXNwaW5uZXIgZ2VuZXJhbC1zcGlubmVyXCIgLz4nICk7XG5cdFx0XHRcdG1heF9yZXF1ZXN0X3NpemVfc2xpZGVyLnNsaWRlciggJ2Rpc2FibGUnICk7XG5cblx0XHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfdXBkYXRlX21heF9yZXF1ZXN0X3NpemUnLFxuXHRcdFx0XHRcdFx0bWF4X3JlcXVlc3Rfc2l6ZTogcGFyc2VJbnQoIHVpLnZhbHVlICksXG5cdFx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMudXBkYXRlX21heF9yZXF1ZXN0X3NpemVcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdFx0bWF4X3JlcXVlc3Rfc2l6ZV9zbGlkZXIuc2xpZGVyKCAnZW5hYmxlJyApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItc3Bpbm5lcicsIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5tYXhfcmVxdWVzdF9zaXplX3Byb2JsZW0gKTtcblx0XHRcdFx0XHRcdHZhciBkaXNwbGF5X2luZm8gPSBnZXRfbWF4X3JlcXVlc3RfZGlzcGxheV9pbmZvKCB3cG1kYl9kYXRhLm1heF9yZXF1ZXN0IC8gMTAyNCApO1xuXHRcdFx0XHRcdFx0c2V0X3NsaWRlcl92YWx1ZSggbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIsIHdwbWRiX2RhdGEubWF4X3JlcXVlc3QgLyAxMDI0LCBkaXNwbGF5X2luZm8udW5pdCwgZGlzcGxheV9pbmZvLmFtb3VudCApO1xuXHRcdFx0XHRcdFx0bWF4X3JlcXVlc3Rfc2l6ZV9zbGlkZXIuc2xpZGVyKCAnZW5hYmxlJyApO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRtYXhfcmVxdWVzdF9zaXplX3NsaWRlci5zbGlkZXIoICdlbmFibGUnICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNsaWRlci1sYWJlbC13cmFwcGVyJywgbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIgKS5hcHBlbmQoICc8c3BhbiBjbGFzcz1cInNsaWRlci1zdWNjZXNzLW1zZ1wiPicgKyB3cG1kYl9zdHJpbmdzLnNhdmVkICsgJzwvc3Bhbj4nICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNsaWRlci1zdWNjZXNzLW1zZycsIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyICkuZmFkZU91dCggMjAwMCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLXNwaW5uZXInLCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdHZhciBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciA9ICQoICcuZGVsYXktYmV0d2Vlbi1yZXF1ZXN0cycgKTtcblx0XHR2YXIgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19zbGlkZXIgPSAkKCAnLnNsaWRlcicsIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyICk7XG5cdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19zbGlkZXIuc2xpZGVyKCB7XG5cdFx0XHRyYW5nZTogJ21pbicsXG5cdFx0XHR2YWx1ZTogcGFyc2VJbnQoIHdwbWRiX2RhdGEuZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cyAvIDEwMDAgKSxcblx0XHRcdG1pbjogMCxcblx0XHRcdG1heDogMTAsXG5cdFx0XHRzdGVwOiAxLFxuXHRcdFx0Y3JlYXRlOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuXHRcdFx0XHRzZXRfc2xpZGVyX3ZhbHVlKCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciwgd3BtZGJfZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzIC8gMTAwMCwgJ3MnICk7XG5cdFx0XHR9LFxuXHRcdFx0c2xpZGU6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG5cdFx0XHRcdHNldF9zbGlkZXJfdmFsdWUoIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyLCB1aS52YWx1ZSwgJ3MnICk7XG5cdFx0XHR9LFxuXHRcdFx0c3RvcDogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0JCggJy5zbGlkZXItc3VjY2Vzcy1tc2cnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuYW1vdW50JywgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19jb250YWluZXIgKS5hZnRlciggJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwic2xpZGVyLXNwaW5uZXIgZ2VuZXJhbC1zcGlubmVyXCIgLz4nICk7XG5cdFx0XHRcdGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfc2xpZGVyLnNsaWRlciggJ2Rpc2FibGUnICk7XG5cblx0XHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfdXBkYXRlX2RlbGF5X2JldHdlZW5fcmVxdWVzdHMnLFxuXHRcdFx0XHRcdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0czogcGFyc2VJbnQoIHVpLnZhbHVlICogMTAwMCApLFxuXHRcdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnVwZGF0ZV9kZWxheV9iZXR3ZWVuX3JlcXVlc3RzXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfc2xpZGVyLnNsaWRlciggJ2VuYWJsZScgKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLXNwaW5uZXInLCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MuZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19wcm9ibGVtICk7XG5cdFx0XHRcdFx0XHRzZXRfc2xpZGVyX3ZhbHVlKCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciwgd3BtZGJfZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzIC8gMTAwMCwgJ3MnICk7XG5cdFx0XHRcdFx0XHRkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX3NsaWRlci5zbGlkZXIoICdlbmFibGUnICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHdwbWRiX2RhdGEuZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cyA9IHBhcnNlSW50KCB1aS52YWx1ZSAqIDEwMDAgKTtcblx0XHRcdFx0XHRcdGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfc2xpZGVyLnNsaWRlciggJ2VuYWJsZScgKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLWxhYmVsLXdyYXBwZXInLCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciApLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwic2xpZGVyLXN1Y2Nlc3MtbXNnXCI+JyArIHdwbWRiX3N0cmluZ3Muc2F2ZWQgKyAnPC9zcGFuPicgKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLXN1Y2Nlc3MtbXNnJywgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19jb250YWluZXIgKS5mYWRlT3V0KCAyMDAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItc3Bpbm5lcicsIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0dmFyICRwdXNoX3NlbGVjdCA9ICQoICcjc2VsZWN0LXRhYmxlcycgKS5jbG9uZSgpO1xuXHRcdHZhciAkcHVsbF9zZWxlY3QgPSAkKCAnI3NlbGVjdC10YWJsZXMnICkuY2xvbmUoKTtcblx0XHR2YXIgJHB1c2hfcG9zdF90eXBlX3NlbGVjdCA9ICQoICcjc2VsZWN0LXBvc3QtdHlwZXMnICkuY2xvbmUoKTtcblx0XHR2YXIgJHB1bGxfcG9zdF90eXBlX3NlbGVjdCA9ICQoICcjc2VsZWN0LXBvc3QtdHlwZXMnICkuY2xvbmUoKTtcblx0XHR2YXIgJHB1c2hfc2VsZWN0X2JhY2t1cCA9ICQoICcjc2VsZWN0LWJhY2t1cCcgKS5jbG9uZSgpO1xuXHRcdHZhciAkcHVsbF9zZWxlY3RfYmFja3VwID0gJCggJyNzZWxlY3QtYmFja3VwJyApLmNsb25lKCk7XG5cblx0XHQkKCAnLmhlbHAtdGFiIC52aWRlbycgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciAkY29udGFpbmVyID0gJCggdGhpcyApLFxuXHRcdFx0XHQkdmlld2VyID0gJCggJy52aWRlby12aWV3ZXInICk7XG5cblx0XHRcdCQoICdhJywgdGhpcyApLmNsaWNrKCBmdW5jdGlvbiggZSApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRcdCR2aWV3ZXIuYXR0ciggJ3NyYycsICcvL3d3dy55b3V0dWJlLmNvbS9lbWJlZC8nICsgJGNvbnRhaW5lci5kYXRhKCAndmlkZW8taWQnICkgKyAnP2F1dG9wbGF5PTEnICk7XG5cdFx0XHRcdCR2aWV3ZXIuc2hvdygpO1xuXHRcdFx0XHR2YXIgb2Zmc2V0ID0gJHZpZXdlci5vZmZzZXQoKTtcblx0XHRcdFx0JCggd2luZG93ICkuc2Nyb2xsVG9wKCBvZmZzZXQudG9wIC0gNTAgKTtcblx0XHRcdH0gKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnLmJhY2t1cC1vcHRpb25zJyApLnNob3coKTtcblx0XHQkKCAnLmtlZXAtYWN0aXZlLXBsdWdpbnMnICkuc2hvdygpO1xuXHRcdGlmICggJ3NhdmVmaWxlJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSApIHtcblx0XHRcdCQoICcuYmFja3VwLW9wdGlvbnMnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5rZWVwLWFjdGl2ZS1wbHVnaW5zJyApLmhpZGUoKTtcblx0XHR9XG5cblx0XHRsYXN0X3JlcGxhY2Vfc3dpdGNoID0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKTtcblxuXHRcdGZ1bmN0aW9uIGNoZWNrX2xpY2VuY2UoIGxpY2VuY2UgKSB7XG5cdFx0XHRjaGVja2VkX2xpY2VuY2UgPSB0cnVlO1xuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ2pzb24nLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9jaGVja19saWNlbmNlJyxcblx0XHRcdFx0XHRsaWNlbmNlOiBsaWNlbmNlLFxuXHRcdFx0XHRcdGNvbnRleHQ6ICdhbGwnLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5jaGVja19saWNlbmNlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLmxpY2Vuc2VfY2hlY2tfcHJvYmxlbSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblxuXHRcdFx0XHRcdHZhciAkc3VwcG9ydF9jb250ZW50ID0gJCggJy5zdXBwb3J0LWNvbnRlbnQnICk7XG5cdFx0XHRcdFx0dmFyICRhZGRvbnNfY29udGVudCA9ICQoICcuYWRkb25zLWNvbnRlbnQnICk7XG5cdFx0XHRcdFx0dmFyICRsaWNlbmNlX2NvbnRlbnQgPSAkKCAnLmxpY2VuY2Utc3RhdHVzOm5vdCgubm90aWZpY2F0aW9uLW1lc3NhZ2UpJyApO1xuXHRcdFx0XHRcdHZhciBsaWNlbmNlX21zZywgc3VwcG9ydF9tc2csIGFkZG9uc19tc2c7XG5cblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS5kYnJhaW5zX2FwaV9kb3duICkge1xuXHRcdFx0XHRcdFx0c3VwcG9ydF9tc2cgPSBkYXRhLmRicmFpbnNfYXBpX2Rvd24gKyBkYXRhLm1lc3NhZ2U7XG5cdFx0XHRcdFx0XHRhZGRvbnNfbXNnID0gZGF0YS5kYnJhaW5zX2FwaV9kb3duO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS5lcnJvcnMgKSB7XG5cblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmVycm9ycy5zdWJzY3JpcHRpb25fZXhwaXJlZCApIHtcblx0XHRcdFx0XHRcdFx0bGljZW5jZV9tc2cgPSBkYXRhLmVycm9ycy5zdWJzY3JpcHRpb25fZXhwaXJlZC5saWNlbmNlO1xuXHRcdFx0XHRcdFx0XHRzdXBwb3J0X21zZyA9IGRhdGEuZXJyb3JzLnN1YnNjcmlwdGlvbl9leHBpcmVkLnN1cHBvcnQ7XG5cdFx0XHRcdFx0XHRcdGFkZG9uc19tc2cgPSBkYXRhLmVycm9ycy5zdWJzY3JpcHRpb25fZXhwaXJlZC5hZGRvbnM7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHR2YXIgbXNnID0gJyc7XG5cdFx0XHRcdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZGF0YS5lcnJvcnMgKSB7XG5cdFx0XHRcdFx0XHRcdFx0bXNnICs9IGRhdGEuZXJyb3JzWyBrZXkgXTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0XHRzdXBwb3J0X21zZyA9IG1zZztcblx0XHRcdFx0XHRcdFx0YWRkb25zX21zZyA9IG1zZztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmFkZG9uX2NvbnRlbnQgKSB7XG5cdFx0XHRcdFx0XHRcdGFkZG9uc19tc2cgKz0gJ1xcbicgKyBkYXRhLmFkZG9uX2NvbnRlbnQ7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdHN1cHBvcnRfbXNnID0gZGF0YS5tZXNzYWdlO1xuXHRcdFx0XHRcdFx0YWRkb25zX21zZyA9IGRhdGEuYWRkb25fY29udGVudDtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkbGljZW5jZV9jb250ZW50LnN0b3AoKS5mYWRlT3V0KCBmYWRlX2R1cmF0aW9uLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoIHRoaXMgKVxuXHRcdFx0XHRcdFx0XHQuY3NzKCB7IHZpc2liaWxpdHk6ICdoaWRkZW4nLCBkaXNwbGF5OiAnYmxvY2snIH0gKS5zbGlkZVVwKClcblx0XHRcdFx0XHRcdFx0LmVtcHR5KClcblx0XHRcdFx0XHRcdFx0Lmh0bWwoIGxpY2VuY2VfbXNnIClcblx0XHRcdFx0XHRcdFx0LnN0b3AoKVxuXHRcdFx0XHRcdFx0XHQuZmFkZUluKCBmYWRlX2R1cmF0aW9uICk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdCRzdXBwb3J0X2NvbnRlbnQuc3RvcCgpLmZhZGVPdXQoIGZhZGVfZHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JCggdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5lbXB0eSgpXG5cdFx0XHRcdFx0XHRcdC5odG1sKCBzdXBwb3J0X21zZyApXG5cdFx0XHRcdFx0XHRcdC5zdG9wKClcblx0XHRcdFx0XHRcdFx0LmZhZGVJbiggZmFkZV9kdXJhdGlvbiApO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHQkYWRkb25zX2NvbnRlbnQuc3RvcCgpLmZhZGVPdXQoIGZhZGVfZHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JCggdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5lbXB0eSgpXG5cdFx0XHRcdFx0XHRcdC5odG1sKCBhZGRvbnNfbXNnIClcblx0XHRcdFx0XHRcdFx0LnN0b3AoKVxuXHRcdFx0XHRcdFx0XHQuZmFkZUluKCBmYWRlX2R1cmF0aW9uICk7XG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9XG5cblx0XHQvKipcblx0XHQgKiBIYW5kbGUgJ0NoZWNrIExpY2Vuc2UgQWdhaW4nIGZ1bmN0aW9uYWxpdHkgZm91bmQgaW4gZXhwaXJlZCBsaWNlbnNlIG1lc3NhZ2VzLlxuXHRcdCAqL1xuXHRcdCQoICcuY29udGVudC10YWInICkub24oICdjbGljaycsICcuY2hlY2stbXktbGljZW5jZS1hZ2FpbicsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0Y2hlY2tlZF9saWNlbmNlID0gZmFsc2U7XG5cdFx0XHQkKCBlLnRhcmdldCApLnJlcGxhY2VXaXRoKCAnQ2hlY2tpbmcuLi4gJyArIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0Y2hlY2tfbGljZW5jZSggbnVsbCwgJ2FsbCcgKTtcblx0XHR9ICk7XG5cdFx0ZnVuY3Rpb24gcmVmcmVzaF90YWJsZV9zZWxlY3RzKCkge1xuXHRcdFx0aWYgKCB1bmRlZmluZWQgIT09IHdwbWRiX2RhdGEgJiYgdW5kZWZpbmVkICE9PSB3cG1kYl9kYXRhLnRoaXNfdGFibGVzICYmIHVuZGVmaW5lZCAhPT0gd3BtZGJfZGF0YS50aGlzX3RhYmxlX3NpemVzX2hyICkge1xuXHRcdFx0XHQkcHVzaF9zZWxlY3QgPSBjcmVhdGVfdGFibGVfc2VsZWN0KCB3cG1kYl9kYXRhLnRoaXNfdGFibGVzLCB3cG1kYl9kYXRhLnRoaXNfdGFibGVfc2l6ZXNfaHIsICQoICRwdXNoX3NlbGVjdCApLnZhbCgpICk7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdW5kZWZpbmVkICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhICYmIHVuZGVmaW5lZCAhPT0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZXMgJiYgdW5kZWZpbmVkICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlX3NpemVzX2hyICkge1xuXHRcdFx0XHQkcHVsbF9zZWxlY3QgPSBjcmVhdGVfdGFibGVfc2VsZWN0KCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlcywgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZV9zaXplc19ociwgJCggJHB1bGxfc2VsZWN0ICkudmFsKCkgKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQkLndwbWRiLmFkZF9hY3Rpb24oICd3cG1kYl9yZWZyZXNoX3RhYmxlX3NlbGVjdHMnLCByZWZyZXNoX3RhYmxlX3NlbGVjdHMgKTtcblxuXHRcdGZ1bmN0aW9uIHVwZGF0ZV9wdXNoX3RhYmxlX3NlbGVjdCgpIHtcblx0XHRcdCQoICcjc2VsZWN0LXRhYmxlcycgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcuc2VsZWN0LXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdXNoX3NlbGVjdCApO1xuXHRcdFx0JCggJyNzZWxlY3QtdGFibGVzJyApLmNoYW5nZSgpO1xuXHRcdH1cblxuXHRcdCQud3BtZGIuYWRkX2FjdGlvbiggJ3dwbWRiX3VwZGF0ZV9wdXNoX3RhYmxlX3NlbGVjdCcsIHVwZGF0ZV9wdXNoX3RhYmxlX3NlbGVjdCApO1xuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlX3B1bGxfdGFibGVfc2VsZWN0KCkge1xuXHRcdFx0JCggJyNzZWxlY3QtdGFibGVzJyApLnJlbW92ZSgpO1xuXHRcdFx0JCggJy5zZWxlY3QtdGFibGVzLXdyYXAnICkucHJlcGVuZCggJHB1bGxfc2VsZWN0ICk7XG5cdFx0XHQkKCAnI3NlbGVjdC10YWJsZXMnICkuY2hhbmdlKCk7XG5cdFx0fVxuXG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfdXBkYXRlX3B1bGxfdGFibGVfc2VsZWN0JywgdXBkYXRlX3B1bGxfdGFibGVfc2VsZWN0ICk7XG5cblx0XHRmdW5jdGlvbiBkaXNhYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zKCkge1xuXHRcdFx0JCggJyNtaWdyYXRlLXNlbGVjdGVkJyApLnBhcmVudHMoICcub3B0aW9uLXNlY3Rpb24nICkuY2hpbGRyZW4oICcuaGVhZGVyLWV4cGFuZC1jb2xsYXBzZScgKS5jaGlsZHJlbiggJy5leHBhbmQtY29sbGFwc2UtYXJyb3cnICkucmVtb3ZlQ2xhc3MoICdjb2xsYXBzZWQnICk7XG5cdFx0XHQkKCAnLnRhYmxlLXNlbGVjdC13cmFwJyApLnNob3coKTtcblx0XHRcdCQoICcjbWlncmF0ZS1vbmx5LXdpdGgtcHJlZml4JyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdCQoICcjbWlncmF0ZS1zZWxlY3RlZCcgKS5wcm9wKCAnY2hlY2tlZCcsIHRydWUgKTtcblx0XHRcdCQoICcudGFibGUtbWlncmF0ZS1vcHRpb25zJyApLmhpZGUoKTtcblx0XHRcdCQoICcuc2VsZWN0LXRhYmxlcy13cmFwJyApLnNob3coKTtcblx0XHR9XG5cblx0XHQkLndwbWRiLmFkZF9hY3Rpb24oICd3cG1kYl9kaXNhYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zJywgZGlzYWJsZV90YWJsZV9taWdyYXRpb25fb3B0aW9ucyApO1xuXG5cdFx0ZnVuY3Rpb24gZW5hYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zKCkge1xuXHRcdFx0JCggJy50YWJsZS1taWdyYXRlLW9wdGlvbnMnICkuc2hvdygpO1xuXHRcdH1cblxuXHRcdCQud3BtZGIuYWRkX2FjdGlvbiggJ3dwbWRiX2VuYWJsZV90YWJsZV9taWdyYXRpb25fb3B0aW9ucycsIGVuYWJsZV90YWJsZV9taWdyYXRpb25fb3B0aW9ucyApO1xuXG5cdFx0ZnVuY3Rpb24gc2VsZWN0X2FsbF90YWJsZXMoKSB7XG5cdFx0XHQkKCAnI3NlbGVjdC10YWJsZXMnICkuY2hpbGRyZW4oICdvcHRpb24nICkucHJvcCggJ3NlbGVjdGVkJywgdHJ1ZSApO1xuXHRcdFx0JCggJyNzZWxlY3QtdGFibGVzJyApLmNoYW5nZSgpO1xuXHRcdH1cblxuXHRcdCQud3BtZGIuYWRkX2FjdGlvbiggJ3dwbWRiX3NlbGVjdF9hbGxfdGFibGVzJywgc2VsZWN0X2FsbF90YWJsZXMgKTtcblxuXHRcdGZ1bmN0aW9uIGJhc2Vfb2xkX3VybCggdmFsdWUsIGFyZ3MgKSB7XG5cdFx0XHRyZXR1cm4gcmVtb3ZlX3Byb3RvY29sKCB3cG1kYl9kYXRhLnRoaXNfdXJsICk7XG5cdFx0fVxuXG5cdFx0JC53cG1kYi5hZGRfZmlsdGVyKCAnd3BtZGJfYmFzZV9vbGRfdXJsJywgYmFzZV9vbGRfdXJsICk7XG5cblx0XHRmdW5jdGlvbiBlc3RhYmxpc2hfcmVtb3RlX2Nvbm5lY3Rpb25fZnJvbV9zYXZlZF9wcm9maWxlKCkge1xuXHRcdFx0dmFyIGFjdGlvbiA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblx0XHRcdGlmICggJ3VuZGVmaW5lZCcgPT09IHR5cGVvZiB3cG1kYl9kZWZhdWx0X3Byb2ZpbGUgfHwgdHJ1ZSA9PT0gd3BtZGJfZGVmYXVsdF9wcm9maWxlIHx8ICdzYXZlZmlsZScgPT09IGFjdGlvbiB8fCBkb2luZ19hamF4IHx8ICF3cG1kYl9kYXRhLmlzX3BybyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblx0XHRcdGRpc2FibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblxuXHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5odG1sKCB3cG1kYl9zdHJpbmdzLmVzdGFibGlzaGluZ19yZW1vdGVfY29ubmVjdGlvbiApO1xuXHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5yZW1vdmVDbGFzcyggJ25vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZSBtaWdyYXRpb24tZXJyb3InICk7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmFwcGVuZCggYWpheF9zcGlubmVyICk7XG5cblx0XHRcdHZhciBpbnRlbnQgPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3ZlcmlmeV9jb25uZWN0aW9uX3RvX3JlbW90ZV9zaXRlJyxcblx0XHRcdFx0XHR1cmw6IGNvbm5lY3Rpb25faW5mb1sgMCBdLFxuXHRcdFx0XHRcdGtleTogY29ubmVjdGlvbl9pbmZvWyAxIF0sXG5cdFx0XHRcdFx0aW50ZW50OiBpbnRlbnQsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnZlcmlmeV9jb25uZWN0aW9uX3RvX3JlbW90ZV9zaXRlLFxuXHRcdFx0XHRcdGNvbnZlcnRfcG9zdF90eXBlX3NlbGVjdGlvbjogd3BtZGJfY29udmVydF9wb3N0X3R5cGVfc2VsZWN0aW9uLFxuXHRcdFx0XHRcdHByb2ZpbGU6IHdwbWRiX2RhdGEucHJvZmlsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxMDIpJywganFYSFIgKSApO1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRlbmFibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEud3BtZGJfZXJyb3IgJiYgMSA9PT0gZGF0YS53cG1kYl9lcnJvciApIHtcblx0XHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmFkZENsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBkYXRhLmJvZHkuaW5kZXhPZiggJzQwMSBVbmF1dGhvcml6ZWQnICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0JCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLnNob3coKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfc3NsX3dhcm5pbmcoIGNvbm5lY3Rpb25faW5mb1sgMCBdLCBjb25uZWN0aW9uX2luZm9bIDEgXSwgZGF0YS5zY2hlbWUgKTtcblx0XHRcdFx0XHRtYXliZV9zaG93X3ByZWZpeF9ub3RpY2UoIGRhdGEucHJlZml4ICk7XG5cblx0XHRcdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkuYWRkQ2xhc3MoICd0ZW1wLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5hdHRyKCAncmVhZG9ubHknLCAncmVhZG9ubHknICk7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0LWJ1dHRvbicgKS5oaWRlKCk7XG5cblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdFx0XHQkKCAnLnN0ZXAtdHdvJyApLnNob3coKTtcblx0XHRcdFx0XHRjb25uZWN0aW9uX2VzdGFibGlzaGVkID0gdHJ1ZTtcblx0XHRcdFx0XHRzZXRfY29ubmVjdGlvbl9kYXRhKCBkYXRhICk7XG5cdFx0XHRcdFx0bW92ZV9jb25uZWN0aW9uX2luZm9fYm94KCk7XG5cblx0XHRcdFx0XHRtYXliZV9zaG93X21peGVkX2Nhc2VkX3RhYmxlX25hbWVfd2FybmluZygpO1xuXG5cdFx0XHRcdFx0dmFyIGxvYWRlZF90YWJsZXMgPSAnJztcblx0XHRcdFx0XHRpZiAoIGZhbHNlID09PSB3cG1kYl9kZWZhdWx0X3Byb2ZpbGUgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYl9sb2FkZWRfdGFibGVzICkge1xuXHRcdFx0XHRcdFx0bG9hZGVkX3RhYmxlcyA9IHdwbWRiX2xvYWRlZF90YWJsZXM7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JHB1bGxfc2VsZWN0ID0gY3JlYXRlX3RhYmxlX3NlbGVjdCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZXMsIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVfc2l6ZXNfaHIsIGxvYWRlZF90YWJsZXMgKTtcblxuXHRcdFx0XHRcdHZhciBsb2FkZWRfcG9zdF90eXBlcyA9ICcnO1xuXHRcdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiX2RlZmF1bHRfcHJvZmlsZSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiX2xvYWRlZF9wb3N0X3R5cGVzICkge1xuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEuc2VsZWN0X3Bvc3RfdHlwZXMgKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcjZXhjbHVkZS1wb3N0LXR5cGVzJyApLmF0dHIoICdjaGVja2VkJywgJ2NoZWNrZWQnICk7XG5cdFx0XHRcdFx0XHRcdCQoICcucG9zdC10eXBlLXNlbGVjdC13cmFwJyApLnNob3coKTtcblx0XHRcdFx0XHRcdFx0bG9hZGVkX3Bvc3RfdHlwZXMgPSBkYXRhLnNlbGVjdF9wb3N0X3R5cGVzO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0bG9hZGVkX3Bvc3RfdHlwZXMgPSB3cG1kYl9sb2FkZWRfcG9zdF90eXBlcztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgJHBvc3RfdHlwZV9zZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnc2VsZWN0JyApO1xuXHRcdFx0XHRcdCQoICRwb3N0X3R5cGVfc2VsZWN0ICkuYXR0cigge1xuXHRcdFx0XHRcdFx0bXVsdGlwbGU6ICdtdWx0aXBsZScsXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2VsZWN0X3Bvc3RfdHlwZXNbXScsXG5cdFx0XHRcdFx0XHRpZDogJ3NlbGVjdC1wb3N0LXR5cGVzJyxcblx0XHRcdFx0XHRcdGNsYXNzOiAnbXVsdGlzZWxlY3QnXG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0JC5lYWNoKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnBvc3RfdHlwZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHR2YXIgc2VsZWN0ZWQgPSAkLmluQXJyYXkoIHZhbHVlLCBsb2FkZWRfcG9zdF90eXBlcyApO1xuXHRcdFx0XHRcdFx0aWYgKCAtMSAhPT0gc2VsZWN0ZWQgfHwgKCB0cnVlID09PSB3cG1kYl9jb252ZXJ0X2V4Y2x1ZGVfcmV2aXNpb25zICYmICdyZXZpc2lvbicgIT09IHZhbHVlICkgKSB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkID0gJyBzZWxlY3RlZD1cInNlbGVjdGVkXCIgJztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHNlbGVjdGVkID0gJyAnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0JCggJHBvc3RfdHlwZV9zZWxlY3QgKS5hcHBlbmQoICc8b3B0aW9uJyArIHNlbGVjdGVkICsgJ3ZhbHVlPVwiJyArIHZhbHVlICsgJ1wiPicgKyB2YWx1ZSArICc8L29wdGlvbj4nICk7XG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0JHB1bGxfcG9zdF90eXBlX3NlbGVjdCA9ICRwb3N0X3R5cGVfc2VsZWN0O1xuXG5cdFx0XHRcdFx0dmFyIGxvYWRlZF90YWJsZXNfYmFja3VwID0gJyc7XG5cdFx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGJfZGVmYXVsdF9wcm9maWxlICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGJfbG9hZGVkX3RhYmxlc19iYWNrdXAgKSB7XG5cdFx0XHRcdFx0XHRsb2FkZWRfdGFibGVzX2JhY2t1cCA9IHdwbWRiX2xvYWRlZF90YWJsZXNfYmFja3VwO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHZhciAkdGFibGVfc2VsZWN0X2JhY2t1cCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdzZWxlY3QnICk7XG5cdFx0XHRcdFx0JCggJHRhYmxlX3NlbGVjdF9iYWNrdXAgKS5hdHRyKCB7XG5cdFx0XHRcdFx0XHRtdWx0aXBsZTogJ211bHRpcGxlJyxcblx0XHRcdFx0XHRcdG5hbWU6ICdzZWxlY3RfYmFja3VwW10nLFxuXHRcdFx0XHRcdFx0aWQ6ICdzZWxlY3QtYmFja3VwJyxcblx0XHRcdFx0XHRcdGNsYXNzOiAnbXVsdGlzZWxlY3QnXG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0JC5lYWNoKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHZhciBzZWxlY3RlZCA9ICQuaW5BcnJheSggdmFsdWUsIGxvYWRlZF90YWJsZXNfYmFja3VwICk7XG5cdFx0XHRcdFx0XHRpZiAoIC0xICE9PSBzZWxlY3RlZCApIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkPVwic2VsZWN0ZWRcIiAnO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQgPSAnICc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCAkdGFibGVfc2VsZWN0X2JhY2t1cCApLmFwcGVuZCggJzxvcHRpb24nICsgc2VsZWN0ZWQgKyAndmFsdWU9XCInICsgdmFsdWUgKyAnXCI+JyArIHZhbHVlICsgJyAoJyArIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVfc2l6ZXNfaHJbIHZhbHVlIF0gKyAnKTwvb3B0aW9uPicgKTtcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkcHVzaF9zZWxlY3RfYmFja3VwID0gJHRhYmxlX3NlbGVjdF9iYWNrdXA7XG5cblx0XHRcdFx0XHRpZiAoICdwdWxsJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSApIHtcblx0XHRcdFx0XHRcdCQud3BtZGIuZG9fYWN0aW9uKCAnd3BtZGJfdXBkYXRlX3B1bGxfdGFibGVfc2VsZWN0JyApO1xuXHRcdFx0XHRcdFx0JCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdCQoICcuZXhjbHVkZS1wb3N0LXR5cGVzLXdhcm5pbmcnICkuYWZ0ZXIoICRwdWxsX3Bvc3RfdHlwZV9zZWxlY3QgKTtcblx0XHRcdFx0XHRcdCQoICcjc2VsZWN0LWJhY2t1cCcgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdWxsX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIGRhdGEucHJlZml4ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnVwbG9hZHMtZGlyJyApLmh0bWwoIHdwbWRiX2RhdGEudGhpc191cGxvYWRzX2RpciApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnI3NlbGVjdC1iYWNrdXAnICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHQkKCAnLmJhY2t1cC10YWJsZXMtd3JhcCcgKS5wcmVwZW5kKCAkcHVzaF9zZWxlY3RfYmFja3VwICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd2ZXJpZnlfY29ubmVjdGlvbl90b19yZW1vdGVfc2l0ZScsIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9ICk7XG5cblx0XHR9XG5cblx0XHQvLyBhdXRvbWF0aWNhbGx5IHZhbGlkYXRlIGNvbm5lY3Rpb24gaW5mbyBpZiB3ZSdyZSBsb2FkaW5nIGEgc2F2ZWQgcHJvZmlsZVxuXHRcdGVzdGFibGlzaF9yZW1vdGVfY29ubmVjdGlvbl9mcm9tX3NhdmVkX3Byb2ZpbGUoKTtcblxuXHRcdC8vIGFkZCB0byA8YT4gdGFncyB3aGljaCBhY3QgYXMgSlMgZXZlbnQgYnV0dG9ucywgd2lsbCBub3QganVtcCBwYWdlIHRvIHRvcCBhbmQgd2lsbCBkZXNlbGVjdCB0aGUgYnV0dG9uXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcuanMtYWN0aW9uLWxpbmsnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoIHRoaXMgKS5ibHVyKCk7XG5cdFx0fSApO1xuXG5cdFx0ZnVuY3Rpb24gZW5hYmxlX3Byb19saWNlbmNlKCBkYXRhLCBsaWNlbmNlX2tleSApIHtcblx0XHRcdCQoICcubGljZW5jZS1pbnB1dCwgLnJlZ2lzdGVyLWxpY2VuY2UnICkucmVtb3ZlKCk7XG5cdFx0XHQkKCAnLmxpY2VuY2Utbm90LWVudGVyZWQnICkucHJlcGVuZCggZGF0YS5tYXNrZWRfbGljZW5jZSApO1xuXHRcdFx0JCggJy5zdXBwb3J0LWNvbnRlbnQnICkuZW1wdHkoKS5odG1sKCAnPHA+JyArIHdwbWRiX3N0cmluZ3MuZmV0Y2hpbmdfbGljZW5zZSArICc8aW1nIHNyYz1cIicgKyBzcGlubmVyX3VybCArICdcIiBhbHQ9XCJcIiBjbGFzcz1cImFqYXgtc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPjwvcD4nICk7XG5cdFx0XHRjaGVja19saWNlbmNlKCBsaWNlbmNlX2tleSApO1xuXG5cdFx0XHQkKCAnLm1pZ3JhdGUtc2VsZWN0aW9uIGxhYmVsJyApLnJlbW92ZUNsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHQkKCAnLm1pZ3JhdGUtc2VsZWN0aW9uIGlucHV0JyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHR9XG5cblx0XHQkKCAnLmxpY2VuY2UtaW5wdXQnICkua2V5cHJlc3MoIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0aWYgKCAxMyA9PT0gZS53aGljaCApIHtcblx0XHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHQkKCAnLnJlZ2lzdGVyLWxpY2VuY2UnICkuY2xpY2soKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyByZWdpc3RlcnMgeW91ciBsaWNlbmNlXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcucmVnaXN0ZXItbGljZW5jZScsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXG5cdFx0XHRpZiAoIGRvaW5nX2xpY2VuY2VfcmVnaXN0cmF0aW9uX2FqYXggKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIGxpY2VuY2Vfa2V5ID0gJC50cmltKCAkKCAnLmxpY2VuY2UtaW5wdXQnICkudmFsKCkgKTtcblx0XHRcdHZhciAkbGljZW5jZV9zdGF0dXMgPSAkKCAnLmxpY2VuY2Utc3RhdHVzJyApO1xuXG5cdFx0XHQkbGljZW5jZV9zdGF0dXMucmVtb3ZlQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2Ugc3VjY2Vzcy1ub3RpY2UnICk7XG5cblx0XHRcdGlmICggJycgPT09IGxpY2VuY2Vfa2V5ICkge1xuXHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuaHRtbCggJzxkaXYgY2xhc3M9XCJub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2VcIj4nICsgd3BtZGJfc3RyaW5ncy5lbnRlcl9saWNlbnNlX2tleSArICc8L2Rpdj4nICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmVtcHR5KCkucmVtb3ZlQ2xhc3MoICdzdWNjZXNzJyApO1xuXHRcdFx0ZG9pbmdfbGljZW5jZV9yZWdpc3RyYXRpb25fYWpheCA9IHRydWU7XG5cdFx0XHQkKCAnLmJ1dHRvbi5yZWdpc3Rlci1saWNlbmNlJyApLmFmdGVyKCAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJyZWdpc3Rlci1saWNlbmNlLWFqYXgtc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPicgKTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ0pTT04nLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9hY3RpdmF0ZV9saWNlbmNlJyxcblx0XHRcdFx0XHRsaWNlbmNlX2tleTogbGljZW5jZV9rZXksXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmFjdGl2YXRlX2xpY2VuY2UsXG5cdFx0XHRcdFx0Y29udGV4dDogJ2xpY2VuY2UnXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGRvaW5nX2xpY2VuY2VfcmVnaXN0cmF0aW9uX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHQkKCAnLnJlZ2lzdGVyLWxpY2VuY2UtYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCRsaWNlbmNlX3N0YXR1cy5odG1sKCB3cG1kYl9zdHJpbmdzLnJlZ2lzdGVyX2xpY2Vuc2VfcHJvYmxlbSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0XHRkb2luZ19saWNlbmNlX3JlZ2lzdHJhdGlvbl9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5yZWdpc3Rlci1saWNlbmNlLWFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmVycm9ycyApIHtcblx0XHRcdFx0XHRcdHZhciBtc2cgPSAnJztcblx0XHRcdFx0XHRcdGZvciAoIHZhciBrZXkgaW4gZGF0YS5lcnJvcnMgKSB7XG5cdFx0XHRcdFx0XHRcdG1zZyArPSBkYXRhLmVycm9yc1sga2V5IF07XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuaHRtbCggbXNnICk7XG5cblx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLm1hc2tlZF9saWNlbmNlICkge1xuXHRcdFx0XHRcdFx0XHRlbmFibGVfcHJvX2xpY2VuY2UoIGRhdGEsIGxpY2VuY2Vfa2V5ICk7XG5cdFx0XHRcdFx0XHRcdCQoICcubWlncmF0ZS10YWIgLmludmFsaWQtbGljZW5jZScgKS5oaWRlKCk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLndwbWRiX2Vycm9yICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS5ib2R5ICkge1xuXHRcdFx0XHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmh0bWwoIGRhdGEuYm9keSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRpZiAoIDEgPT09IE51bWJlciggZGF0YS5pc19maXJzdF9hY3RpdmF0aW9uICkgKSB7XG5cdFx0XHRcdFx0XHRcdHdwbWRiX3N0cmluZ3Mud2VsY29tZV90ZXh0ID0gd3BtZGJfc3RyaW5ncy53ZWxjb21lX3RleHQucmVwbGFjZSggJyUxJHMnLCAnaHR0cHM6Ly9kZWxpY2lvdXNicmFpbnMuY29tL3dwLW1pZ3JhdGUtZGItcHJvL2RvYy9xdWljay1zdGFydC1ndWlkZS8nICk7XG5cdFx0XHRcdFx0XHRcdHdwbWRiX3N0cmluZ3Mud2VsY29tZV90ZXh0ID0gd3BtZGJfc3RyaW5ncy53ZWxjb21lX3RleHQucmVwbGFjZSggJyUyJHMnLCAnaHR0cHM6Ly9kZWxpY2lvdXNicmFpbnMuY29tL3dwLW1pZ3JhdGUtZGItcHJvL3ZpZGVvcy8nICk7XG5cblx0XHRcdFx0XHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmFmdGVyKFxuXHRcdFx0XHRcdFx0XHRcdCc8ZGl2IGlkPVwid2VsY29tZS13cmFwXCI+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnPGltZyBpZD1cIndlbGNvbWUtaW1nXCIgc3JjPVwiJyArIHdwbWRiX2RhdGEudGhpc19wbHVnaW5fdXJsICsgJ2Fzc2V0L2Rpc3QvaW1nL3dlbGNvbWUuanBnXCIgLz4nICtcblx0XHRcdFx0XHRcdFx0XHRcdCc8ZGl2IGNsYXNzPVwid2VsY29tZS10ZXh0XCI+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHRcdCc8aDM+JyArIHdwbWRiX3N0cmluZ3Mud2VsY29tZV90aXRsZSArICc8L2gzPicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnPHA+JyArIHdwbWRiX3N0cmluZ3Mud2VsY29tZV90ZXh0ICsgJzwvcD4nICtcblx0XHRcdFx0XHRcdFx0XHRcdCc8L2Rpdj4nICtcblx0XHRcdFx0XHRcdFx0XHQnPC9kaXY+J1xuXHRcdFx0XHRcdFx0XHQpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuaHRtbCggd3BtZGJfc3RyaW5ncy5saWNlbnNlX3JlZ2lzdGVyZWQgKS5kZWxheSggNTAwMCApLmZhZGVPdXQoIDEwMDAsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHQkKCB0aGlzICkuY3NzKCB7IHZpc2liaWxpdHk6ICdoaWRkZW4nLCBkaXNwbGF5OiAnYmxvY2snIH0gKS5zbGlkZVVwKCk7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuYWRkQ2xhc3MoICdzdWNjZXNzIG5vdGlmaWNhdGlvbi1tZXNzYWdlIHN1Y2Nlc3Mtbm90aWNlJyApO1xuXHRcdFx0XHRcdFx0ZW5hYmxlX3Byb19saWNlbmNlKCBkYXRhLCBsaWNlbmNlX2tleSApO1xuXHRcdFx0XHRcdFx0JCggJy5pbnZhbGlkLWxpY2VuY2UnICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0fSApO1xuXG5cdFx0Ly8gY2xlYXJzIHRoZSBkZWJ1ZyBsb2dcblx0XHQkKCAnLmNsZWFyLWxvZycgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLmRlYnVnLWxvZy10ZXh0YXJlYScgKS52YWwoICcnICk7XG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2NsZWFyX2xvZycsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmNsZWFyX2xvZ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5jbGVhcl9sb2dfcHJvYmxlbSApO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0gKTtcblxuXHRcdC8vIHVwZGF0ZXMgdGhlIGRlYnVnIGxvZyB3aGVuIHRoZSB1c2VyIHN3aXRjaGVzIHRvIHRoZSBoZWxwIHRhYlxuXHRcdGZ1bmN0aW9uIHJlZnJlc2hfZGVidWdfbG9nKCkge1xuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9nZXRfbG9nJyxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuZ2V0X2xvZ1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy51cGRhdGVfbG9nX3Byb2JsZW0gKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5kZWJ1Zy1sb2ctdGV4dGFyZWEnICkudmFsKCBkYXRhICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9XG5cblx0XHQvLyBzZWxlY3QgYWxsIHRhYmxlc1xuXHRcdCQoICcubXVsdGlzZWxlY3Qtc2VsZWN0LWFsbCcgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbXVsdGlzZWxlY3QgPSAkKCB0aGlzICkucGFyZW50cyggJy5zZWxlY3Qtd3JhcCcgKS5jaGlsZHJlbiggJy5tdWx0aXNlbGVjdCcgKTtcblx0XHRcdCQoICdvcHRpb24nLCBtdWx0aXNlbGVjdCApLnByb3AoICdzZWxlY3RlZCcsIDEgKTtcblx0XHRcdCQoIG11bHRpc2VsZWN0ICkuZm9jdXMoKS50cmlnZ2VyKCAnY2hhbmdlJyApO1xuXHRcdH0gKTtcblxuXHRcdC8vIGRlc2VsZWN0IGFsbCB0YWJsZXNcblx0XHQkKCAnLm11bHRpc2VsZWN0LWRlc2VsZWN0LWFsbCcgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbXVsdGlzZWxlY3QgPSAkKCB0aGlzICkucGFyZW50cyggJy5zZWxlY3Qtd3JhcCcgKS5jaGlsZHJlbiggJy5tdWx0aXNlbGVjdCcgKTtcblx0XHRcdCQoICdvcHRpb24nLCBtdWx0aXNlbGVjdCApLnJlbW92ZUF0dHIoICdzZWxlY3RlZCcgKTtcblx0XHRcdCQoIG11bHRpc2VsZWN0ICkuZm9jdXMoKS50cmlnZ2VyKCAnY2hhbmdlJyApO1xuXHRcdH0gKTtcblxuXHRcdC8vIGludmVydCB0YWJsZSBzZWxlY3Rpb25cblx0XHQkKCAnLm11bHRpc2VsZWN0LWludmVydC1zZWxlY3Rpb24nICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG11bHRpc2VsZWN0ID0gJCggdGhpcyApLnBhcmVudHMoICcuc2VsZWN0LXdyYXAnICkuY2hpbGRyZW4oICcubXVsdGlzZWxlY3QnICk7XG5cdFx0XHQkKCAnb3B0aW9uJywgbXVsdGlzZWxlY3QgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0JCggdGhpcyApLmF0dHIoICdzZWxlY3RlZCcsICEkKCB0aGlzICkuYXR0ciggJ3NlbGVjdGVkJyApICk7XG5cdFx0XHR9ICk7XG5cdFx0XHQkKCBtdWx0aXNlbGVjdCApLmZvY3VzKCkudHJpZ2dlciggJ2NoYW5nZScgKTtcblx0XHR9ICk7XG5cblx0XHQvLyBvbiBvcHRpb24gc2VsZWN0IGhpZGUgYWxsIFwiYWR2YW5jZWRcIiBvcHRpb24gZGl2cyBhbmQgc2hvdyB0aGUgY29ycmVjdCBkaXYgZm9yIHRoZSBvcHRpb24gc2VsZWN0ZWRcblx0XHQkKCAnLm9wdGlvbi1ncm91cCBpbnB1dFt0eXBlPXJhZGlvXScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGdyb3VwID0gJCggdGhpcyApLmNsb3Nlc3QoICcub3B0aW9uLWdyb3VwJyApO1xuXHRcdFx0JCggJ3VsJywgZ3JvdXAgKS5oaWRlKCk7XG5cdFx0XHR2YXIgcGFyZW50ID0gJCggdGhpcyApLmNsb3Nlc3QoICdsaScgKTtcblx0XHRcdCQoICd1bCcsIHBhcmVudCApLnNob3coKTtcblx0XHR9ICk7XG5cblx0XHQvLyBvbiBwYWdlIGxvYWQsIGV4cGFuZCBoaWRkZW4gZGl2cyBmb3Igc2VsZWN0ZWQgb3B0aW9ucyAoYnJvd3NlciBmb3JtIGNhY2hlKVxuXHRcdCQoICcub3B0aW9uLWdyb3VwJyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5vcHRpb24tZ3JvdXAgaW5wdXRbdHlwZT1yYWRpb10nICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdGlmICggJCggdGhpcyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdFx0dmFyIHBhcmVudCA9ICQoIHRoaXMgKS5jbG9zZXN0KCAnbGknICk7XG5cdFx0XHRcdFx0JCggJ3VsJywgcGFyZW50ICkuc2hvdygpO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gZXhwYW5kIGFuZCBjb2xsYXBzZSBjb250ZW50IG9uIGNsaWNrXG5cdFx0JCggJy5oZWFkZXItZXhwYW5kLWNvbGxhcHNlJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggJCggJy5leHBhbmQtY29sbGFwc2UtYXJyb3cnLCB0aGlzICkuaGFzQ2xhc3MoICdjb2xsYXBzZWQnICkgKSB7XG5cdFx0XHRcdCQoICcuZXhwYW5kLWNvbGxhcHNlLWFycm93JywgdGhpcyApLnJlbW92ZUNsYXNzKCAnY29sbGFwc2VkJyApO1xuXHRcdFx0XHQkKCB0aGlzICkubmV4dCgpLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuZXhwYW5kLWNvbGxhcHNlLWFycm93JywgdGhpcyApLmFkZENsYXNzKCAnY29sbGFwc2VkJyApO1xuXHRcdFx0XHQkKCB0aGlzICkubmV4dCgpLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQkKCAnLmNoZWNrYm94LWxhYmVsIGlucHV0W3R5cGU9Y2hlY2tib3hdJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICQoIHRoaXMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkubmV4dCgpLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5uZXh0KCkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdC8vIHdhcm5pbmcgZm9yIGV4Y2x1ZGluZyBwb3N0IHR5cGVzXG5cdFx0JCggJy5zZWxlY3QtcG9zdC10eXBlcy13cmFwJyApLm9uKCAnY2hhbmdlJywgJyNzZWxlY3QtcG9zdC10eXBlcycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0ZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBleGNsdWRlX3Bvc3RfdHlwZXNfd2FybmluZygpIHtcblx0XHRcdHZhciBleGNsdWRlZF9wb3N0X3R5cGVzID0gJCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS52YWwoKTtcblx0XHRcdHZhciBleGNsdWRlZF9wb3N0X3R5cGVzX3RleHQgPSAnJztcblx0XHRcdHZhciAkZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcgPSAkKCAnLmV4Y2x1ZGUtcG9zdC10eXBlcy13YXJuaW5nJyApO1xuXG5cdFx0XHRpZiAoIGV4Y2x1ZGVkX3Bvc3RfdHlwZXMgKSB7XG5cdFx0XHRcdGV4Y2x1ZGVkX3Bvc3RfdHlwZXNfdGV4dCA9ICc8Y29kZT4nICsgZXhjbHVkZWRfcG9zdF90eXBlcy5qb2luKCAnPC9jb2RlPiwgPGNvZGU+JyApICsgJzwvY29kZT4nO1xuXHRcdFx0XHQkKCAnLmV4Y2x1ZGVkLXBvc3QtdHlwZXMnICkuaHRtbCggZXhjbHVkZWRfcG9zdF90eXBlc190ZXh0ICk7XG5cblx0XHRcdFx0aWYgKCAnMCcgPT09ICRleGNsdWRlX3Bvc3RfdHlwZXNfd2FybmluZy5jc3MoICdvcGFjaXR5JyApICkge1xuXHRcdFx0XHRcdCRleGNsdWRlX3Bvc3RfdHlwZXNfd2FybmluZ1xuXHRcdFx0XHRcdFx0LmNzcyggeyBvcGFjaXR5OiAwIH0gKVxuXHRcdFx0XHRcdFx0LnNsaWRlRG93biggMjAwIClcblx0XHRcdFx0XHRcdC5hbmltYXRlKCB7IG9wYWNpdHk6IDEgfSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmdcblx0XHRcdFx0XHQuY3NzKCB7IG9wYWNpdHk6IDAgfSApXG5cdFx0XHRcdFx0LnNsaWRlVXAoIDIwMCApXG5cdFx0XHRcdFx0LmFuaW1hdGUoIHsgb3BhY2l0eTogMCB9ICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0aWYgKCAkKCAnI2V4Y2x1ZGUtcG9zdC10eXBlcycgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0aWYgKCAkKCAnI3NlbGVjdC1wb3N0LXR5cGVzJyApLnZhbCgpICkge1xuXHRcdFx0XHQkKCAnLmV4Y2x1ZGUtcG9zdC10eXBlcy13YXJuaW5nJyApLmNzcyggeyBkaXNwbGF5OiAnYmxvY2snLCBvcGFjaXR5OiAxIH0gKTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHQvLyBzcGVjaWFsIGV4cGFuZCBhbmQgY29sbGFwc2UgY29udGVudCBvbiBjbGljayBmb3Igc2F2ZSBtaWdyYXRpb24gcHJvZmlsZVxuXHRcdCQoICcjc2F2ZS1taWdyYXRpb24tcHJvZmlsZScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0d3BtZGIuZnVuY3Rpb25zLnVwZGF0ZV9taWdyYXRlX2J1dHRvbl90ZXh0KCk7XG5cdFx0XHRpZiAoICQoIHRoaXMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLnNob3coKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuc2F2ZS1zZXR0aW5ncy1idXR0b24nICkuaGlkZSgpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdGlmICggJCggJyNzYXZlLW1pZ3JhdGlvbi1wcm9maWxlJyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLnNob3coKTtcblx0XHR9XG5cblx0XHQkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS5mb2N1cyggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnI2NyZWF0ZV9uZXcnICkucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cdFx0fSApO1xuXG5cdFx0JCggJy5jaGVja2JveC1sYWJlbCBpbnB1dFt0eXBlPWNoZWNrYm94XScgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdGlmICggJCggdGhpcyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnQoKS5uZXh0KCkuc2hvdygpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdC8vIEFKQVggbWlncmF0ZSBidXR0b25cblx0XHQkKCAnLm1pZ3JhdGUtZGItYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHQkKCB0aGlzICkuYmx1cigpO1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdHdwbWRiLm1pZ3JhdGlvbl9zdGF0ZV9pZCA9ICcnO1xuXG5cdFx0XHRpZiAoIGZhbHNlID09PSAkLndwbWRiLmFwcGx5X2ZpbHRlcnMoICd3cG1kYl9taWdyYXRpb25fcHJvZmlsZV9yZWFkeScsIHRydWUgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBjaGVjayB0aGF0IHRoZXkndmUgc2VsZWN0ZWQgc29tZSB0YWJsZXMgdG8gbWlncmF0ZVxuXHRcdFx0aWYgKCAkKCAnI21pZ3JhdGUtc2VsZWN0ZWQnICkuaXMoICc6Y2hlY2tlZCcgKSAmJiBudWxsID09PSAkKCAnI3NlbGVjdC10YWJsZXMnICkudmFsKCkgKSB7XG5cdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnBsZWFzZV9zZWxlY3Rfb25lX3RhYmxlICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgdGhhdCB0aGV5J3ZlIHNlbGVjdGVkIHNvbWUgdGFibGVzIHRvIGJhY2t1cFxuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICYmICQoICcjYmFja3VwLW1hbnVhbC1zZWxlY3QnICkuaXMoICc6Y2hlY2tlZCcgKSAmJiBudWxsID09PSAkKCAnI3NlbGVjdC1iYWNrdXAnICkudmFsKCkgKSB7XG5cdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnBsZWFzZV9zZWxlY3Rfb25lX3RhYmxlX2JhY2t1cCApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBuZXdfdXJsX21pc3NpbmcgPSBmYWxzZTtcblx0XHRcdHZhciBuZXdfZmlsZV9wYXRoX21pc3NpbmcgPSBmYWxzZTtcblx0XHRcdGlmICggJCggJyNuZXctdXJsJyApLmxlbmd0aCAmJiAhJCggJyNuZXctdXJsJyApLnZhbCgpICkge1xuXHRcdFx0XHQkKCAnI25ldy11cmwtbWlzc2luZy13YXJuaW5nJyApLnNob3coKTtcblx0XHRcdFx0JCggJyNuZXctdXJsJyApLmZvY3VzKCk7XG5cdFx0XHRcdCQoICdodG1sLGJvZHknICkuc2Nyb2xsVG9wKCAwICk7XG5cdFx0XHRcdG5ld191cmxfbWlzc2luZyA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJCggJyNuZXctcGF0aCcgKS5sZW5ndGggJiYgISQoICcjbmV3LXBhdGgnICkudmFsKCkgKSB7XG5cdFx0XHRcdCQoICcjbmV3LXBhdGgtbWlzc2luZy13YXJuaW5nJyApLnNob3coKTtcblx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gbmV3X3VybF9taXNzaW5nICkge1xuXHRcdFx0XHRcdCQoICcjbmV3LXBhdGgnICkuZm9jdXMoKTtcblx0XHRcdFx0XHQkKCAnaHRtbCxib2R5JyApLnNjcm9sbFRvcCggMCApO1xuXHRcdFx0XHR9XG5cdFx0XHRcdG5ld19maWxlX3BhdGhfbWlzc2luZyA9IHRydWU7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHJ1ZSA9PT0gbmV3X3VybF9taXNzaW5nIHx8IHRydWUgPT09IG5ld19maWxlX3BhdGhfbWlzc2luZyApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBhbHNvIHNhdmUgcHJvZmlsZVxuXHRcdFx0aWYgKCAkKCAnI3NhdmUtbWlncmF0aW9uLXByb2ZpbGUnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0c2F2ZV9hY3RpdmVfcHJvZmlsZSgpO1xuXHRcdFx0fVxuXG5cdFx0XHRmb3JtX2RhdGEgPSAkKCAkKCAnI21pZ3JhdGUtZm9ybScgKVswXS5lbGVtZW50cyApLm5vdCggJy5hdXRoLWNyZWRlbnRpYWxzJyApLnNlcmlhbGl6ZSgpO1xuXG5cdFx0XHRtaWdyYXRpb25faW50ZW50ID0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKTtcblxuXHRcdFx0c3RhZ2UgPSAnYmFja3VwJztcblxuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRzdGFnZSA9ICdtaWdyYXRlJztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCBmYWxzZSA9PT0gJCggJyNjcmVhdGUtYmFja3VwJyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdHN0YWdlID0gJ21pZ3JhdGUnO1xuXHRcdFx0fVxuXG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbiA9IHdwbWRiLm1pZ3JhdGlvbl9wcm9ncmVzc19jb250cm9sbGVyLm5ld01pZ3JhdGlvbigge1xuXHRcdFx0XHQnbG9jYWxUYWJsZVNpemVzJzogd3BtZGJfZGF0YS50aGlzX3RhYmxlX3NpemVzLFxuXHRcdFx0XHQnbG9jYWxUYWJsZVJvd3MnOiB3cG1kYl9kYXRhLnRoaXNfdGFibGVfcm93cyxcblx0XHRcdFx0J3JlbW90ZVRhYmxlU2l6ZXMnOiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgPyB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlX3NpemVzIDogbnVsbCxcblx0XHRcdFx0J3JlbW90ZVRhYmxlUm93cyc6ICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSA/IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVfcm93cyA6IG51bGwsXG5cdFx0XHRcdCdtaWdyYXRpb25JbnRlbnQnOiB3cG1kYl9taWdyYXRpb25fdHlwZSgpXG5cdFx0XHR9ICk7XG5cblx0XHRcdHZhciBiYWNrdXBfb3B0aW9uID0gJCggJ2lucHV0W25hbWU9YmFja3VwX29wdGlvbl06Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciB0YWJsZV9vcHRpb24gPSAkKCAnaW5wdXRbbmFtZT10YWJsZV9taWdyYXRlX29wdGlvbl06Y2hlY2tlZCcgKS52YWwoKTtcblx0XHRcdHZhciBzZWxlY3RlZF90YWJsZXMgPSAnJztcblx0XHRcdHZhciBkYXRhX3R5cGUgPSAnJztcblxuXHRcdFx0Ly8gc2V0IHVwIGJhY2t1cCBzdGFnZVxuXHRcdFx0aWYgKCAnYmFja3VwJyA9PT0gc3RhZ2UgKSB7XG5cdFx0XHRcdGlmICggJ21pZ3JhdGVfb25seV93aXRoX3ByZWZpeCcgPT09IHRhYmxlX29wdGlvbiAmJiAnYmFja3VwX3NlbGVjdGVkJyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRiYWNrdXBfb3B0aW9uID0gJ2JhY2t1cF9vbmx5X3dpdGhfcHJlZml4Jztcblx0XHRcdFx0fVxuXHRcdFx0XHRpZiAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0XHRkYXRhX3R5cGUgPSAncmVtb3RlJztcblx0XHRcdFx0XHRpZiAoICdiYWNrdXBfb25seV93aXRoX3ByZWZpeCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucHJlZml4ZWRfdGFibGVzO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICdiYWNrdXBfc2VsZWN0ZWQnID09PSBiYWNrdXBfb3B0aW9uICkge1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRfdGFibGVzID0gJCggJyNzZWxlY3QtdGFibGVzJyApLnZhbCgpO1xuXHRcdFx0XHRcdFx0c2VsZWN0ZWRfdGFibGVzID0gJC53cG1kYi5hcHBseV9maWx0ZXJzKCAnd3BtZGJfYmFja3VwX3NlbGVjdGVkX3RhYmxlcycsIHNlbGVjdGVkX3RhYmxlcyApO1xuXHRcdFx0XHRcdFx0dGFibGVzX3RvX21pZ3JhdGUgPSBnZXRfaW50ZXJzZWN0KCBzZWxlY3RlZF90YWJsZXMsIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ2JhY2t1cF9tYW51YWxfc2VsZWN0JyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gJCggJyNzZWxlY3QtYmFja3VwJyApLnZhbCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRkYXRhX3R5cGUgPSAnbG9jYWwnO1xuXHRcdFx0XHRcdGlmICggJ2JhY2t1cF9vbmx5X3dpdGhfcHJlZml4JyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gd3BtZGJfZGF0YS50aGlzX3ByZWZpeGVkX3RhYmxlcztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAnYmFja3VwX3NlbGVjdGVkJyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkX3RhYmxlcyA9ICQoICcjc2VsZWN0LXRhYmxlcycgKS52YWwoKTtcblx0XHRcdFx0XHRcdHNlbGVjdGVkX3RhYmxlcyA9ICQud3BtZGIuYXBwbHlfZmlsdGVycyggJ3dwbWRiX2JhY2t1cF9zZWxlY3RlZF90YWJsZXMnLCBzZWxlY3RlZF90YWJsZXMgKTtcblx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gZ2V0X2ludGVyc2VjdCggc2VsZWN0ZWRfdGFibGVzLCB3cG1kYl9kYXRhLnRoaXNfdGFibGVzICk7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ2JhY2t1cF9tYW51YWxfc2VsZWN0JyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gJCggJyNzZWxlY3QtYmFja3VwJyApLnZhbCgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLmFkZFN0YWdlKCAnYmFja3VwJywgdGFibGVzX3RvX21pZ3JhdGUsIGRhdGFfdHlwZSwge1xuXHRcdFx0XHRcdHN0cmluZ3M6IHtcblx0XHRcdFx0XHRcdG1pZ3JhdGVkOiB3cG1kYl9zdHJpbmdzLmJhY2tlZF91cFxuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzZXQgdXAgbWlncmF0aW9uIHN0YWdlXG5cdFx0XHRpZiAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCB8fCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRkYXRhX3R5cGUgPSAnbG9jYWwnO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZGF0YV90eXBlID0gJ3JlbW90ZSc7XG5cdFx0XHR9XG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5hZGRTdGFnZSggJ21pZ3JhdGUnLCBnZXRfdGFibGVzX3RvX21pZ3JhdGUoIG51bGwsIG51bGwgKSwgZGF0YV90eXBlICk7XG5cblx0XHRcdC8vIGFkZCBhbnkgYWRkaXRpb25hbCBtaWdyYXRpb24gc3RhZ2VzIHZpYSBob29rXG5cdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX2FkZF9taWdyYXRpb25fc3RhZ2VzJywge1xuXHRcdFx0XHQnZGF0YV90eXBlJzogZGF0YV90eXBlLFxuXHRcdFx0XHQndGFibGVzX3RvX21pZ3JhdGUnOiBnZXRfdGFibGVzX3RvX21pZ3JhdGUoIG51bGwsIG51bGwgKVxuXHRcdFx0fSApO1xuXG5cdFx0XHR2YXIgdGFibGVfaW50ZW50ID0gJCggJ2lucHV0W25hbWU9dGFibGVfbWlncmF0ZV9vcHRpb25dOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblx0XHRcdHZhciB0YWJsZV9yb3dzID0gJyc7XG5cblx0XHRcdHJlbW90ZV9zaXRlID0gY29ubmVjdGlvbl9pbmZvWyAwIF07XG5cdFx0XHRzZWNyZXRfa2V5ID0gY29ubmVjdGlvbl9pbmZvWyAxIF07XG5cblx0XHRcdHZhciBzdGF0aWNfbWlncmF0aW9uX2xhYmVsID0gJyc7XG5cblx0XHRcdGNvbXBsZXRlZF9tc2cgPSB3cG1kYl9zdHJpbmdzLmV4cG9ydGluZ19jb21wbGV0ZTtcblxuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRzdGF0aWNfbWlncmF0aW9uX2xhYmVsID0gd3BtZGJfc3RyaW5ncy5leHBvcnRpbmdfcGxlYXNlX3dhaXQ7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRzdGF0aWNfbWlncmF0aW9uX2xhYmVsID0gZ2V0X21pZ3JhdGlvbl9zdGF0dXNfbGFiZWwoIHJlbW90ZV9zaXRlLCBtaWdyYXRpb25faW50ZW50LCAnbWlncmF0aW5nJyApO1xuXHRcdFx0XHRjb21wbGV0ZWRfbXNnID0gZ2V0X21pZ3JhdGlvbl9zdGF0dXNfbGFiZWwoIHJlbW90ZV9zaXRlLCBtaWdyYXRpb25faW50ZW50LCAnY29tcGxldGVkJyApO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICdiYWNrdXAnID09PSBzdGFnZSApIHtcblx0XHRcdFx0dGFibGVzX3RvX21pZ3JhdGUgPSB3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXRTdGFnZUl0ZW1zKCAnYmFja3VwJywgJ25hbWUnICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLmdldFN0YWdlSXRlbXMoICdtaWdyYXRlJywgJ25hbWUnICk7XG5cdFx0XHR9XG5cblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLnNldEFjdGl2ZVN0YWdlKCBzdGFnZSApO1xuXG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRUaXRsZSggc3RhdGljX21pZ3JhdGlvbl9sYWJlbCApO1xuXG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zdGFydFRpbWVyKCk7XG5cblx0XHRcdGN1cnJlbnRseV9taWdyYXRpbmcgPSB0cnVlO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdHVzKCAnYWN0aXZlJyApO1xuXG5cdFx0XHR2YXIgcmVxdWVzdF9kYXRhID0ge1xuXHRcdFx0XHRhY3Rpb246ICd3cG1kYl9pbml0aWF0ZV9taWdyYXRpb24nLFxuXHRcdFx0XHRpbnRlbnQ6IG1pZ3JhdGlvbl9pbnRlbnQsXG5cdFx0XHRcdHVybDogcmVtb3RlX3NpdGUsXG5cdFx0XHRcdGtleTogc2VjcmV0X2tleSxcblx0XHRcdFx0Zm9ybV9kYXRhOiBmb3JtX2RhdGEsXG5cdFx0XHRcdHN0YWdlOiBzdGFnZSxcblx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmluaXRpYXRlX21pZ3JhdGlvblxuXHRcdFx0fTtcblxuXHRcdFx0cmVxdWVzdF9kYXRhLnNpdGVfZGV0YWlscyA9IHtcblx0XHRcdFx0bG9jYWw6IHdwbWRiX2RhdGEuc2l0ZV9kZXRhaWxzXG5cdFx0XHR9O1xuXG5cdFx0XHRpZiAoICdzYXZlZmlsZScgIT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdHJlcXVlc3RfZGF0YS50ZW1wX3ByZWZpeCA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGVtcF9wcmVmaXg7XG5cdFx0XHRcdHJlcXVlc3RfZGF0YS5zaXRlX2RldGFpbHMucmVtb3RlID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5zaXRlX2RldGFpbHM7XG5cdFx0XHR9XG5cblx0XHRcdC8vIHNpdGVfZGV0YWlscyBjYW4gaGF2ZSBhIHZlcnkgbGFyZ2UgbnVtYmVyIG9mIGVsZW1lbnRzIHRoYXQgYmxvd3Mgb3V0IFBIUCdzIG1heF9pbnB1dF92YXJzXG5cdFx0XHQvLyBzbyB3ZSByZWR1Y2UgaXQgZG93biB0byBvbmUgdmFyaWFibGUgZm9yIHRoaXMgb25lIFBPU1QuXG5cdFx0XHRyZXF1ZXN0X2RhdGEuc2l0ZV9kZXRhaWxzID0gSlNPTi5zdHJpbmdpZnkoIHJlcXVlc3RfZGF0YS5zaXRlX2RldGFpbHMgKTtcblxuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiByZXF1ZXN0X2RhdGEsXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXG5cdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgZ2V0X2FqYXhfZXJyb3JzKCBqcVhIUi5yZXNwb25zZVRleHQsICcoIzExMiknLCBqcVhIUiApLCAnZXJyb3InICk7XG5cblx0XHRcdFx0XHRjb25zb2xlLmxvZygganFYSFIgKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyggdGV4dFN0YXR1cyApO1xuXHRcdFx0XHRcdGNvbnNvbGUubG9nKCBlcnJvclRocm93biApO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS53cG1kYl9lcnJvciAmJiAxID09PSBkYXRhLndwbWRiX2Vycm9yICkge1xuXHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgZGF0YS5ib2R5LCAnZXJyb3InICk7XG5cblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3cG1kYi5taWdyYXRpb25fc3RhdGVfaWQgPSBkYXRhLm1pZ3JhdGlvbl9zdGF0ZV9pZDtcblxuXHRcdFx0XHRcdHZhciBpID0gMDtcblxuXHRcdFx0XHRcdC8vIFNldCBkZWxheSBiZXR3ZWVuIHJlcXVlc3RzIC0gdXNlIG1heCBvZiBsb2NhbC9yZW1vdGUgdmFsdWVzLCAwIGlmIGRvaW5nIGV4cG9ydFxuXHRcdFx0XHRcdGRlbGF5X2JldHdlZW5fcmVxdWVzdHMgPSAwO1xuXHRcdFx0XHRcdGlmICggJ3NhdmVmaWxlJyAhPT0gbWlncmF0aW9uX2ludGVudCAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLmRlbGF5X2JldHdlZW5fcmVxdWVzdHMgKSB7XG5cdFx0XHRcdFx0XHRkZWxheV9iZXR3ZWVuX3JlcXVlc3RzID0gTWF0aC5tYXgoIHBhcnNlSW50KCB3cG1kYl9kYXRhLmRlbGF5X2JldHdlZW5fcmVxdWVzdHMgKSwgcGFyc2VJbnQoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cyApICk7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGVfdGFibGVfcmVjdXJzaXZlID0gZnVuY3Rpb24oIGN1cnJlbnRfcm93LCBwcmltYXJ5X2tleXMgKSB7XG5cblx0XHRcdFx0XHRcdGlmICggaSA+PSB0YWJsZXNfdG9fbWlncmF0ZS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdGlmICggJ2JhY2t1cCcgPT09IHN0YWdlICkge1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLm1vZGVsLnNldEFjdGl2ZVN0YWdlKCAnbWlncmF0ZScgKTtcblxuXHRcdFx0XHRcdFx0XHRcdHN0YWdlID0gJ21pZ3JhdGUnO1xuXHRcdFx0XHRcdFx0XHRcdGkgPSAwO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gc2hvdWxkIGdldCBmcm9tIG1vZGVsXG5cdFx0XHRcdFx0XHRcdFx0dGFibGVzX3RvX21pZ3JhdGUgPSBnZXRfdGFibGVzX3RvX21pZ3JhdGUoIG51bGwsIG51bGwgKTtcblxuXHRcdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRcdCQoICcucHJvZ3Jlc3MtbGFiZWwnICkucmVtb3ZlQ2xhc3MoICdsYWJlbC12aXNpYmxlJyApO1xuXG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLmhvb2tzID0gJC53cG1kYi5hcHBseV9maWx0ZXJzKCAnd3BtZGJfYmVmb3JlX21pZ3JhdGlvbl9jb21wbGV0ZV9ob29rcycsIHdwbWRiLmNvbW1vbi5ob29rcyApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcy5wdXNoKCB3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlICk7XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLmhvb2tzLnB1c2goIHdwbWRiLmZ1bmN0aW9ucy53cG1kYl9mbHVzaCApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcyA9ICQud3BtZGIuYXBwbHlfZmlsdGVycyggJ3dwbWRiX2FmdGVyX21pZ3JhdGlvbl9jb21wbGV0ZV9ob29rcycsIHdwbWRiLmNvbW1vbi5ob29rcyApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcy5wdXNoKCB3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cyApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5uZXh0X3N0ZXBfaW5fbWlncmF0aW9uID0geyBmbjogd3BtZGJfY2FsbF9uZXh0X2hvb2sgfTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIGxhc3RfdGFibGUgPSAwO1xuXHRcdFx0XHRcdFx0aWYgKCBpID09PSAoIHRhYmxlc190b19taWdyYXRlLmxlbmd0aCAtIDEgKSApIHtcblx0XHRcdFx0XHRcdFx0bGFzdF90YWJsZSA9IDE7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHZhciBnemlwID0gMDtcblx0XHRcdFx0XHRcdGlmICggJ3NhdmVmaWxlJyAhPT0gbWlncmF0aW9uX2ludGVudCAmJiAxID09PSBwYXJzZUludCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5nemlwICkgKSB7XG5cdFx0XHRcdFx0XHRcdGd6aXAgPSAxO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgcmVxdWVzdF9kYXRhID0ge1xuXHRcdFx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9taWdyYXRlX3RhYmxlJyxcblx0XHRcdFx0XHRcdFx0bWlncmF0aW9uX3N0YXRlX2lkOiB3cG1kYi5taWdyYXRpb25fc3RhdGVfaWQsXG5cdFx0XHRcdFx0XHRcdHRhYmxlOiB0YWJsZXNfdG9fbWlncmF0ZVsgaSBdLFxuXHRcdFx0XHRcdFx0XHRzdGFnZTogc3RhZ2UsXG5cdFx0XHRcdFx0XHRcdGN1cnJlbnRfcm93OiBjdXJyZW50X3Jvdyxcblx0XHRcdFx0XHRcdFx0bGFzdF90YWJsZTogbGFzdF90YWJsZSxcblx0XHRcdFx0XHRcdFx0cHJpbWFyeV9rZXlzOiBwcmltYXJ5X2tleXMsXG5cdFx0XHRcdFx0XHRcdGd6aXA6IGd6aXAsXG5cdFx0XHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5taWdyYXRlX3RhYmxlXG5cdFx0XHRcdFx0XHR9O1xuXG5cdFx0XHRcdFx0XHRpZiAoICdzYXZlZmlsZScgIT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdFx0XHRcdHJlcXVlc3RfZGF0YS5ib3R0bGVuZWNrID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5ib3R0bGVuZWNrO1xuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0X2RhdGEucHJlZml4ID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wcmVmaXg7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdGlmICggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSAmJiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnBhdGhfY3VycmVudF9zaXRlICYmIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuZG9tYWluICkge1xuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0X2RhdGEucGF0aF9jdXJyZW50X3NpdGUgPSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnBhdGhfY3VycmVudF9zaXRlO1xuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0X2RhdGEuZG9tYWluX2N1cnJlbnRfc2l0ZSA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuZG9tYWluO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0XHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdFx0XHRcdHRpbWVvdXQ6IDAsXG5cdFx0XHRcdFx0XHRcdGRhdGE6IHJlcXVlc3RfZGF0YSxcblx0XHRcdFx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHByb2dyZXNzX3RleHQgPSB3cG1kYl9zdHJpbmdzLnRhYmxlX3Byb2Nlc3NfcHJvYmxlbSArICcgJyArIHRhYmxlc190b19taWdyYXRlWyBpIF0gKyAnPGJyIC8+PGJyIC8+JyArIHdwbWRiX3N0cmluZ3Muc3RhdHVzICsgJzogJyArIGpxWEhSLnN0YXR1cyArICcgJyArIGpxWEhSLnN0YXR1c1RleHQgKyAnPGJyIC8+PGJyIC8+JyArIHdwbWRiX3N0cmluZ3MucmVzcG9uc2UgKyAnOjxiciAvPicgKyBqcVhIUi5yZXNwb25zZVRleHQ7XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgcHJvZ3Jlc3NfdGV4dCwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCBqcVhIUiApO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCB0ZXh0U3RhdHVzICk7XG5cdFx0XHRcdFx0XHRcdFx0Y29uc29sZS5sb2coIGVycm9yVGhyb3duICk7XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRkYXRhID0gJC50cmltKCBkYXRhICk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIHJvd19pbmZvcm1hdGlvbiA9IHdwbWRiX3BhcnNlX2pzb24oIGRhdGEgKTtcblx0XHRcdFx0XHRcdFx0XHR2YXIgZXJyb3JfdGV4dCA9ICcnO1xuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gcm93X2luZm9ybWF0aW9uIHx8IG51bGwgPT09IHJvd19pbmZvcm1hdGlvbiApIHtcblxuXHRcdFx0XHRcdFx0XHRcdFx0Ly8gc2hvdWxkIHVwZGF0ZSBtb2RlbFxuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCAnJyA9PT0gZGF0YSB8fCBudWxsID09PSBkYXRhICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRlcnJvcl90ZXh0ID0gd3BtZGJfc3RyaW5ncy50YWJsZV9wcm9jZXNzX3Byb2JsZW1fZW1wdHlfcmVzcG9uc2UgKyAnICcgKyB0YWJsZXNfdG9fbWlncmF0ZVsgaSBdO1xuXHRcdFx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZXJyb3JfdGV4dCA9IGdldF9hamF4X2Vycm9ycyggZGF0YSwgbnVsbCwgbnVsbCApO1xuXHRcdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggd3BtZGJfc3RyaW5ncy5taWdyYXRpb25fZmFpbGVkLCBlcnJvcl90ZXh0LCAnZXJyb3InICk7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHJvd19pbmZvcm1hdGlvbi53cG1kYl9lcnJvciAmJiAxID09PSByb3dfaW5mb3JtYXRpb24ud3BtZGJfZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggd3BtZGJfc3RyaW5ncy5taWdyYXRpb25fZmFpbGVkLCByb3dfaW5mb3JtYXRpb24uYm9keSwgJ2Vycm9yJyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdC8vc3VjY2Vzc2Z1bCBpdGVyYXRpb24sIHVwZGF0ZSBtb2RlbFxuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFRleHQoKTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXRTdGFnZU1vZGVsKCBzdGFnZSApLnNldEl0ZW1Sb3dzVHJhbnNmZXJyZWQoIHRhYmxlc190b19taWdyYXRlWyBpIF0sIHJvd19pbmZvcm1hdGlvbi5jdXJyZW50X3JvdyApO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gV2UgbmVlZCB0aGUgcmV0dXJuZWQgZmlsZSBuYW1lIGZvciBkZWxpdmVyeSBvciBkaXNwbGF5IHRvIHRoZSB1c2VyLlxuXHRcdFx0XHRcdFx0XHRcdGlmICggMSA9PT0gbGFzdF90YWJsZSAmJiAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHJvd19pbmZvcm1hdGlvbi5kdW1wX2ZpbGVuYW1lICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRkdW1wX2ZpbGVuYW1lID0gcm93X2luZm9ybWF0aW9uLmR1bXBfZmlsZW5hbWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygcm93X2luZm9ybWF0aW9uLmR1bXBfcGF0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZHVtcF9wYXRoID0gcm93X2luZm9ybWF0aW9uLmR1bXBfcGF0aDtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAoIC0xID09PSBwYXJzZUludCggcm93X2luZm9ybWF0aW9uLmN1cnJlbnRfcm93ICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb3dfaW5mb3JtYXRpb24uY3VycmVudF9yb3cgPSAnJztcblx0XHRcdFx0XHRcdFx0XHRcdHJvd19pbmZvcm1hdGlvbi5wcmltYXJ5X2tleXMgPSAnJztcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdGZuOiB3cG1kYi5mdW5jdGlvbnMubWlncmF0ZV90YWJsZV9yZWN1cnNpdmUsXG5cdFx0XHRcdFx0XHRcdFx0XHRhcmdzOiBbIHJvd19pbmZvcm1hdGlvbi5jdXJyZW50X3Jvdywgcm93X2luZm9ybWF0aW9uLnByaW1hcnlfa2V5cyBdXG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5uZXh0X3N0ZXBfaW5fbWlncmF0aW9uID0ge1xuXHRcdFx0XHRcdFx0Zm46IHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRlX3RhYmxlX3JlY3Vyc2l2ZSxcblx0XHRcdFx0XHRcdGFyZ3M6IFsgJy0xJywgJycgXVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9ICk7IC8vIGVuZCBhamF4XG5cblx0XHR9ICk7XG5cblx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciApIHtcblx0XHRcdFx0aWYgKCAnJyA9PT0gd3BtZGIuY29tbW9uLm5vbl9mYXRhbF9lcnJvcnMgKSB7XG5cdFx0XHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICYmIHRydWUgPT09ICQoICcjc2F2ZV9jb21wdXRlcicgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0VGV4dCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX2NhbmNlbGxlZCApIHtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBjb21wbGV0ZWRfbXNnICsgJyZuYnNwOzxkaXYgY2xhc3M9XCJkYXNoaWNvbnMgZGFzaGljb25zLXllc1wiPjwvZGl2PicsIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NhbmNlbGxlZF9zdWNjZXNzLCAnY2FuY2VsbGVkJyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggY29tcGxldGVkX21zZyArICcmbmJzcDs8ZGl2IGNsYXNzPVwiZGFzaGljb25zIGRhc2hpY29ucy15ZXNcIj48L2Rpdj4nLCAnJywgJ2NvbXBsZXRlJyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLmNvbXBsZXRlZF93aXRoX3NvbWVfZXJyb3JzLCB3cG1kYi5jb21tb24ubm9uX2ZhdGFsX2Vycm9ycywgJ2Vycm9yJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQoICcubWlncmF0aW9uLWNvbnRyb2xzJyApLmFkZENsYXNzKCAnaGlkZGVuJyApO1xuXG5cdFx0XHQvLyByZXNldCBtaWdyYXRpb24gdmFyaWFibGVzIHNvIGNvbnNlY3V0aXZlIG1pZ3JhdGlvbnMgd29yayBjb3JyZWN0bHlcblx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcyA9IFtdO1xuXHRcdFx0d3BtZGIuY29tbW9uLmNhbGxfc3RhY2sgPSBbXTtcblx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSBmYWxzZTtcblx0XHRcdGN1cnJlbnRseV9taWdyYXRpbmcgPSBmYWxzZTtcblx0XHRcdG1pZ3JhdGlvbl9jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0bWlncmF0aW9uX3BhdXNlZCA9IGZhbHNlO1xuXHRcdFx0bWlncmF0aW9uX2NhbmNlbGxlZCA9IGZhbHNlO1xuXHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0d3BtZGIuY29tbW9uLm5vbl9mYXRhbF9lcnJvcnMgPSAnJztcblxuXHRcdFx0JCggJy5wcm9ncmVzcy1sYWJlbCcgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcubWlncmF0aW9uLXByb2dyZXNzLWFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcuY2xvc2UtcHJvZ3Jlc3MtY29udGVudCcgKS5zaG93KCk7XG5cdFx0XHQkKCAnI292ZXJsYXknICkuY3NzKCAnY3Vyc29yJywgJ3BvaW50ZXInICk7XG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5zZXRNaWdyYXRpb25Db21wbGV0ZSgpO1xuXHRcdH07XG5cblx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdCQoICcubWlncmF0aW9uLWNvbnRyb2xzJyApLmFkZENsYXNzKCAnaGlkZGVuJyApO1xuXG5cdFx0XHRpZiAoICdzYXZlZmlsZScgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdGN1cnJlbnRseV9taWdyYXRpbmcgPSBmYWxzZTtcblx0XHRcdFx0dmFyIG1pZ3JhdGVfY29tcGxldGVfdGV4dCA9IHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NvbXBsZXRlO1xuXHRcdFx0XHRpZiAoICQoICcjc2F2ZV9jb21wdXRlcicgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdHZhciB1cmwgPSB3cG1kYl9kYXRhLnRoaXNfZG93bmxvYWRfdXJsICsgZW5jb2RlVVJJQ29tcG9uZW50KCBkdW1wX2ZpbGVuYW1lICk7XG5cdFx0XHRcdFx0aWYgKCAkKCAnI2d6aXBfZmlsZScgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdFx0dXJsICs9ICcmZ3ppcD0xJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gdXJsO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG1pZ3JhdGVfY29tcGxldGVfdGV4dCA9IHdwbWRiX3N0cmluZ3MuY29tcGxldGVkX2R1bXBfbG9jYXRlZF9hdCArICcgJyArIGR1bXBfcGF0aDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgKSB7XG5cblx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBjb21wbGV0ZWRfbXNnLCBtaWdyYXRlX2NvbXBsZXRlX3RleHQsICdjb21wbGV0ZScgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7IC8vIHJlbmFtZSB0ZW1wIHRhYmxlcywgZGVsZXRlIG9sZCB0YWJsZXNcblxuXHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggbnVsbCwgd3BtZGJfc3RyaW5ncy5maW5hbGl6aW5nX21pZ3JhdGlvbiwgJ2ZpbmFsaXppbmcnICk7XG5cblx0XHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfZmluYWxpemVfbWlncmF0aW9uJyxcblx0XHRcdFx0XHRcdG1pZ3JhdGlvbl9zdGF0ZV9pZDogd3BtZGIubWlncmF0aW9uX3N0YXRlX2lkLFxuXHRcdFx0XHRcdFx0cHJlZml4OiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnByZWZpeCxcblx0XHRcdFx0XHRcdHRhYmxlczogdGFibGVzX3RvX21pZ3JhdGUuam9pbiggJywnICksXG5cdFx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuZmluYWxpemVfbWlncmF0aW9uXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIHdwbWRiX3N0cmluZ3MuZmluYWxpemVfdGFibGVzX3Byb2JsZW0sICdlcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0YWxlcnQoIGpxWEhSICsgJyA6ICcgKyB0ZXh0U3RhdHVzICsgJyA6ICcgKyBlcnJvclRocm93biApO1xuXHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRpZiAoICcxJyAhPT0gJC50cmltKCBkYXRhICkgKSB7XG5cdFx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIGRhdGEsICdlcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm5leHRfc3RlcF9pbl9taWdyYXRpb24gPSB7IGZuOiB3cG1kYl9jYWxsX25leHRfaG9vayB9O1xuXHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHdwbWRiLmZ1bmN0aW9ucy53cG1kYl9mbHVzaCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRUZXh0KCB3cG1kYl9zdHJpbmdzLmZsdXNoaW5nICk7XG5cdFx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2ZsdXNoJyxcblx0XHRcdFx0XHRcdG1pZ3JhdGlvbl9zdGF0ZV9pZDogd3BtZGIubWlncmF0aW9uX3N0YXRlX2lkLFxuXHRcdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmZsdXNoXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIHdwbWRiX3N0cmluZ3MuZmx1c2hfcHJvYmxlbSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRhbGVydCgganFYSFIgKyAnIDogJyArIHRleHRTdGF0dXMgKyAnIDogJyArIGVycm9yVGhyb3duICk7XG5cdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdGlmICggJzEnICE9PSAkLnRyaW0oIGRhdGEgKSApIHtcblx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgZGF0YSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHsgZm46IHdwbWRiX2NhbGxfbmV4dF9ob29rIH07XG5cdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLnVwZGF0ZV9taWdyYXRlX2J1dHRvbl90ZXh0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWlncmF0aW9uX2ludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cdFx0XHR2YXIgc2F2ZV9zdHJpbmcgPSAoICQoICcjc2F2ZS1taWdyYXRpb24tcHJvZmlsZScgKS5pcyggJzpjaGVja2VkJyApICkgPyAnX3NhdmUnIDogJyc7XG5cdFx0XHR2YXIgbWlncmF0ZV9zdHJpbmcgPSAnbWlncmF0ZV9idXR0b25fJyArICggKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkgPyAnZXhwb3J0JyA6IG1pZ3JhdGlvbl9pbnRlbnQgKSArIHNhdmVfc3RyaW5nO1xuXHRcdFx0JCggJy5taWdyYXRlLWRiIC5idXR0b24tcHJpbWFyeScgKS52YWwoIHdwbWRiX3N0cmluZ3NbIG1pZ3JhdGVfc3RyaW5nIF0gKTtcblx0XHR9O1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLnVwZGF0ZV9taWdyYXRlX2J1dHRvbl90ZXh0KCk7XG5cblx0XHQvLyBjbG9zZSBwcm9ncmVzcyBwb3AgdXAgb25jZSBtaWdyYXRpb24gaXMgY29tcGxldGVkXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcuY2xvc2UtcHJvZ3Jlc3MtY29udGVudC1idXR0b24nLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGhpZGVfb3ZlcmxheSgpO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ucmVzdG9yZVRpdGxlRWxlbSgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnI292ZXJsYXknLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX2NvbXBsZXRlZCAmJiBlLnRhcmdldCA9PT0gdGhpcyApIHtcblx0XHRcdFx0aGlkZV9vdmVybGF5KCk7XG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnJlc3RvcmVUaXRsZUVsZW0oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBoaWRlX292ZXJsYXkoKSB7XG5cdFx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlQ2xhc3MoICdzaG93JyApLmFkZENsYXNzKCAnaGlkZScgKTtcblx0XHRcdCQoICcjb3ZlcmxheSA+IGRpdicgKS5yZW1vdmVDbGFzcyggJ3Nob3cnICkuYWRkQ2xhc3MoICdoaWRlJyApO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uJHByb1ZlcnNpb24uZmluZCggJ2lmcmFtZScgKS5yZW1vdmUoKTtcblx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlKCk7XG5cdFx0XHR9LCA1MDAgKTtcblx0XHRcdG1pZ3JhdGlvbl9jb21wbGV0ZWQgPSBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBBSkFYIHNhdmUgYnV0dG9uIHByb2ZpbGVcblx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gJC50cmltKCAkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoKSApICYmICQoICcjY3JlYXRlX25ldycgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5lbnRlcl9uYW1lX2Zvcl9wcm9maWxlICk7XG5cdFx0XHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLmZvY3VzKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHNhdmVfYWN0aXZlX3Byb2ZpbGUoKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBzYXZlX2FjdGl2ZV9wcm9maWxlKCkge1xuXHRcdFx0dmFyIHByb2ZpbGU7XG5cdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLmJsdXIoKTtcblxuXHRcdFx0aWYgKCBkb2luZ19zYXZlX3Byb2ZpbGUgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgdGhhdCB0aGV5J3ZlIHNlbGVjdGVkIHNvbWUgdGFibGVzIHRvIG1pZ3JhdGVcblx0XHRcdGlmICggJCggJyNtaWdyYXRlLXNlbGVjdGVkJyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtdGFibGVzJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIHRoYXQgdGhleSd2ZSBzZWxlY3RlZCBzb21lIHRhYmxlcyB0byBiYWNrdXBcblx0XHRcdGlmICggJ3NhdmVmaWxlJyAhPT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSAmJiAkKCAnI2JhY2t1cC1tYW51YWwtc2VsZWN0JyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtYmFja3VwJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZV9iYWNrdXAgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgY3JlYXRlX25ld19wcm9maWxlID0gZmFsc2U7XG5cblx0XHRcdGlmICggJCggJyNjcmVhdGVfbmV3JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdGNyZWF0ZV9uZXdfcHJvZmlsZSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHR2YXIgcHJvZmlsZV9uYW1lID0gJCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCk7XG5cblx0XHRcdGRvaW5nX3NhdmVfcHJvZmlsZSA9IHRydWU7XG5cdFx0XHRwcm9maWxlID0gJCggJCggJyNtaWdyYXRlLWZvcm0nIClbMF0uZWxlbWVudHMgKS5ub3QoICcuYXV0aC1jcmVkZW50aWFscycgKS5zZXJpYWxpemUoKTtcblxuXHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnIClcblx0XHRcdFx0LmFmdGVyKCAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJzYXZlLXByb2ZpbGUtYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JyApO1xuXG5cdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9zYXZlX3Byb2ZpbGUnLFxuXHRcdFx0XHRcdHByb2ZpbGU6IHByb2ZpbGUsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnNhdmVfcHJvZmlsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3Muc2F2ZV9wcm9maWxlX3Byb2JsZW0gKTtcblx0XHRcdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQkKCAnLnNhdmUtcHJvZmlsZS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5hZnRlciggJzxzcGFuIGNsYXNzPVwiYWpheC1zdWNjZXNzLW1zZ1wiPicgKyB3cG1kYl9zdHJpbmdzLnNhdmVkICsgJzwvc3Bhbj4nICk7XG5cdFx0XHRcdFx0JCggJy5hamF4LXN1Y2Nlc3MtbXNnJyApLmZhZGVPdXQoIDIwMDAsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRkb2luZ19zYXZlX3Byb2ZpbGUgPSBmYWxzZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0dmFyIHVwZGF0ZWRfcHJvZmlsZV9pZCA9IHBhcnNlSW50KCAkKCAnI21pZ3JhdGUtZm9ybSBpbnB1dFtuYW1lPXNhdmVfbWlncmF0aW9uX3Byb2ZpbGVfb3B0aW9uXTpjaGVja2VkJyApLnZhbCgpLCAxMCApICsgMTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXByb2ZpbGUtYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcuc2F2ZS1zZXR0aW5ncy1idXR0b24nICkuYWZ0ZXIoICc8c3BhbiBjbGFzcz1cImFqYXgtc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zdWNjZXNzLW1zZycgKS5mYWRlT3V0KCAyMDAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0ZG9pbmdfc2F2ZV9wcm9maWxlID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBjcmVhdGVfbmV3X3Byb2ZpbGUgKSB7XG5cdFx0XHRcdFx0XHR2YXIgbmV3X3Byb2ZpbGVfa2V5ID0gcGFyc2VJbnQoIGRhdGEsIDEwICk7XG5cdFx0XHRcdFx0XHR2YXIgbmV3X3Byb2ZpbGVfaWQgPSBuZXdfcHJvZmlsZV9rZXkgKyAxO1xuXHRcdFx0XHRcdFx0dmFyIG5ld19saSA9ICQoICc8bGk+PHNwYW4gY2xhc3M9XCJkZWxldGUtcHJvZmlsZVwiIGRhdGEtcHJvZmlsZS1pZD1cIicgKyBuZXdfcHJvZmlsZV9pZCArICdcIj48L3NwYW4+PGxhYmVsIGZvcj1cInByb2ZpbGUtJyArIG5ld19wcm9maWxlX2lkICsgJ1wiPjxpbnB1dCBpZD1cInByb2ZpbGUtJyArIG5ld19wcm9maWxlX2lkICsgJ1wiIHZhbHVlPVwiJyArIG5ld19wcm9maWxlX2tleSArICdcIiBuYW1lPVwic2F2ZV9taWdyYXRpb25fcHJvZmlsZV9vcHRpb25cIiB0eXBlPVwicmFkaW9cIj48L2xhYmVsPjwvbGk+JyApO1xuXHRcdFx0XHRcdFx0bmV3X2xpLmZpbmQoICdsYWJlbCcgKS5hcHBlbmQoIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCAnICcgKyBwcm9maWxlX25hbWUgKSApO1xuXHRcdFx0XHRcdFx0dXBkYXRlZF9wcm9maWxlX2lkID0gbmV3X3Byb2ZpbGVfaWQ7XG5cblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlX25ldycgKS5wYXJlbnRzKCAnbGknICkuYmVmb3JlKCBuZXdfbGkgKTtcblx0XHRcdFx0XHRcdCQoICcjcHJvZmlsZS0nICsgbmV3X3Byb2ZpbGVfaWQgKS5hdHRyKCAnY2hlY2tlZCcsICdjaGVja2VkJyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFB1c2ggdXBkYXRlZCBwcm9maWxlIGlkIHRvIGhpc3RvcnkgaWYgYXZhaWxhYmxlXG5cdFx0XHRcdFx0dmFyIHVwZGF0ZWRfdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSggJyNtaWdyYXRlJywgJycgKS5yZXBsYWNlKCAvJndwbWRiLXByb2ZpbGU9LT9cXGQrLywgJycgKSArICcmd3BtZGItcHJvZmlsZT0nICsgdXBkYXRlZF9wcm9maWxlX2lkO1xuXHRcdFx0XHRcdHZhciB1cGRhdGVkX3Byb2ZpbGVfbmFtZSA9ICQoICcjbWlncmF0ZS1mb3JtIGlucHV0W25hbWU9c2F2ZV9taWdyYXRpb25fcHJvZmlsZV9vcHRpb25dOmNoZWNrZWQnICkucGFyZW50KCkudGV4dCgpLnRyaW0oKTtcblxuXHRcdFx0XHRcdGlmICggJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSApIHtcblx0XHRcdFx0XHRcdGlmICggJCggJyNtaWdyYXRlLWZvcm0gLmNydW1icycgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcjbWlncmF0ZS1mb3JtIC5jcnVtYnMgLmNydW1iOmxhc3QnICkudGV4dCggdXBkYXRlZF9wcm9maWxlX25hbWUgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHZhciAkY3J1bWJzID0gJCggJzxkaXYgY2xhc3M9XCJjcnVtYnNcIiAvPicgKVxuXHRcdFx0XHRcdFx0XHRcdC5hcHBlbmQoICc8YSBjbGFzcz1cImNydW1iXCIgaHJlZj1cIicgKyB3cG1kYl9kYXRhLnRoaXNfcGx1Z2luX2Jhc2UgKyAnXCI+IFNhdmVkIFByb2ZpbGVzIDwvYT4nIClcblx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJjcnVtYlwiPicgKyB1cGRhdGVkX3Byb2ZpbGVfbmFtZSArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdFx0XHQkKCAnI21pZ3JhdGUtZm9ybScgKS5wcmVwZW5kKCAkY3J1bWJzICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoIHsgdXBkYXRlZF9wcm9maWxlX2lkOiB1cGRhdGVkX3Byb2ZpbGVfaWQgfSwgbnVsbCwgdXBkYXRlZF91cmwgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9XG5cblx0XHQvLyBzYXZlIGZpbGUgKGV4cG9ydCkgLyBwdXNoIC8gcHVsbCBzcGVjaWFsIGNvbmRpdGlvbnNcblx0XHRmdW5jdGlvbiBtb3ZlX2Nvbm5lY3Rpb25faW5mb19ib3goKSB7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdCQoICcucHJlZml4LW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5kaWZmZXJlbnQtcGx1Z2luLXZlcnNpb24tbm90aWNlJyApLmhpZGUoKTtcblx0XHRcdCQoICcuc3RlcC10d28nICkuc2hvdygpO1xuXHRcdFx0JCggJy5iYWNrdXAtb3B0aW9ucycgKS5zaG93KCk7XG5cdFx0XHQkKCAnLmtlZXAtYWN0aXZlLXBsdWdpbnMnICkuc2hvdygpO1xuXHRcdFx0JCggJy5kaXJlY3RvcnktcGVybWlzc2lvbi1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJyNjcmVhdGUtYmFja3VwJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cC1sYWJlbCcgKS5yZW1vdmVDbGFzcyggJ2Rpc2FibGVkJyApO1xuXHRcdFx0JCggJy5iYWNrdXAtb3B0aW9uLWRpc2FibGVkJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29tcGF0aWJpbGl0eS1vbGRlci1teXNxbCcgKS5oaWRlKCk7XG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblx0XHRcdHZhciBwcm9maWxlX25hbWU7XG5cdFx0XHR3cG1kYl90b2dnbGVfbWlncmF0aW9uX2FjdGlvbl90ZXh0KCk7XG5cdFx0XHRpZiAoICdwdWxsJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSApIHtcblx0XHRcdFx0JCggJy5wdWxsLWxpc3QgbGknICkuYXBwZW5kKCAkY29ubmVjdGlvbl9pbmZvX2JveCApO1xuXHRcdFx0XHQkY29ubmVjdGlvbl9pbmZvX2JveC5zaG93KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgY29ubmVjdGlvbl90ZXh0YXJlYSA9ICQoIHRoaXMgKS5maW5kKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICk7XG5cdFx0XHRcdFx0aWYgKCAhY29ubmVjdGlvbl90ZXh0YXJlYS52YWwoKSApIHtcblx0XHRcdFx0XHRcdGNvbm5lY3Rpb25fdGV4dGFyZWEuZm9jdXMoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0aWYgKCBjb25uZWN0aW9uX2VzdGFibGlzaGVkICkge1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaGlkZSgpO1xuXHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuc2hvdygpO1xuXHRcdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucHJlZml4ICk7XG5cdFx0XHRcdFx0JCggJy51cGxvYWRzLWRpcicgKS5odG1sKCB3cG1kYl9kYXRhLnRoaXNfdXBsb2Fkc19kaXIgKTtcblx0XHRcdFx0XHRpZiAoIGZhbHNlID09PSBwcm9maWxlX25hbWVfZWRpdGVkICkge1xuXHRcdFx0XHRcdFx0cHJvZmlsZV9uYW1lID0gZ2V0X2RvbWFpbl9uYW1lKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnVybCApO1xuXHRcdFx0XHRcdFx0JCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCBwcm9maWxlX25hbWUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3ByZWZpeF9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnByZWZpeC1ub3RpY2UucHVsbCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gc2hvd19zc2xfbm90aWNlICkge1xuXHRcdFx0XHRcdFx0JCggJy5zc2wtbm90aWNlJyApLnNob3coKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3ZlcnNpb25fbm90aWNlICkge1xuXHRcdFx0XHRcdFx0JCggJy5kaWZmZXJlbnQtcGx1Z2luLXZlcnNpb24tbm90aWNlJyApLnNob3coKTtcblx0XHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR3cG1kYl90b2dnbGVfbWlncmF0aW9uX2FjdGlvbl90ZXh0KCk7XG5cdFx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGJfZGF0YS53cml0ZV9wZXJtaXNzaW9uICkge1xuXHRcdFx0XHRcdFx0JCggJyNjcmVhdGUtYmFja3VwJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cCcgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkKCAnI2NyZWF0ZS1iYWNrdXAtbGFiZWwnICkuYWRkQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLW9wdGlvbi1kaXNhYmxlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnVwbG9hZC1kaXJlY3RvcnktbG9jYXRpb24nICkuaHRtbCggd3BtZGJfZGF0YS50aGlzX3VwbG9hZF9kaXJfbG9uZyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLnNob3coKTtcblx0XHRcdFx0XHQkKCAnLnN0ZXAtdHdvJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICggJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHQkKCAnLnB1c2gtbGlzdCBsaScgKS5hcHBlbmQoICRjb25uZWN0aW9uX2luZm9fYm94ICk7XG5cdFx0XHRcdCRjb25uZWN0aW9uX2luZm9fYm94LnNob3coIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBjb25uZWN0aW9uX3RleHRhcmVhID0gJCggdGhpcyApLmZpbmQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKTtcblx0XHRcdFx0XHRpZiAoICFjb25uZWN0aW9uX3RleHRhcmVhLnZhbCgpICkge1xuXHRcdFx0XHRcdFx0Y29ubmVjdGlvbl90ZXh0YXJlYS5mb2N1cygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXHRcdFx0XHRpZiAoIGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgKSB7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5oaWRlKCk7XG5cdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5zaG93KCk7XG5cdFx0XHRcdFx0JCggJy50YWJsZS1wcmVmaXgnICkuaHRtbCggd3BtZGJfZGF0YS50aGlzX3ByZWZpeCApO1xuXHRcdFx0XHRcdCQoICcudXBsb2Fkcy1kaXInICkuaHRtbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS51cGxvYWRzX2RpciApO1xuXHRcdFx0XHRcdGlmICggZmFsc2UgPT09IHByb2ZpbGVfbmFtZV9lZGl0ZWQgKSB7XG5cdFx0XHRcdFx0XHRwcm9maWxlX25hbWUgPSBnZXRfZG9tYWluX25hbWUoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXJsICk7XG5cdFx0XHRcdFx0XHQkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoIHByb2ZpbGVfbmFtZSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHNob3dfcHJlZml4X25vdGljZSApIHtcblx0XHRcdFx0XHRcdCQoICcucHJlZml4LW5vdGljZS5wdXNoJyApLnNob3coKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3NzbF9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuc2hvdygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHNob3dfdmVyc2lvbl9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmRpZmZlcmVudC1wbHVnaW4tdmVyc2lvbi1ub3RpY2UnICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHdwbWRiX3RvZ2dsZV9taWdyYXRpb25fYWN0aW9uX3RleHQoKTtcblx0XHRcdFx0XHRpZiAoICcwJyA9PT0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS53cml0ZV9wZXJtaXNzaW9ucyApIHtcblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cCcgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdFx0XHQkKCAnI2NyZWF0ZS1iYWNrdXAnICkuYXR0ciggJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JCggJyNjcmVhdGUtYmFja3VwLWxhYmVsJyApLmFkZENsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkKCAnLmJhY2t1cC1vcHRpb24tZGlzYWJsZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0JCggJy51cGxvYWQtZGlyZWN0b3J5LWxvY2F0aW9uJyApLmh0bWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXBsb2FkX2Rpcl9sb25nICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKCAnc2F2ZWZpbGUnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5zaG93KCk7XG5cdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIHdwbWRiX2RhdGEudGhpc19wcmVmaXggKTtcblx0XHRcdFx0JCggJy5jb21wYXRpYmlsaXR5LW9sZGVyLW15c3FsJyApLnNob3coKTtcblx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gcHJvZmlsZV9uYW1lX2VkaXRlZCApIHtcblx0XHRcdFx0XHQkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoICcnICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5iYWNrdXAtb3B0aW9ucycgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcua2VlcC1hY3RpdmUtcGx1Z2lucycgKS5oaWRlKCk7XG5cdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiX2RhdGEud3JpdGVfcGVybWlzc2lvbiApIHtcblx0XHRcdFx0XHQkKCAnLmRpcmVjdG9yeS1wZXJtaXNzaW9uLW5vdGljZScgKS5zaG93KCk7XG5cdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCk7XG5cdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ21vdmVfY29ubmVjdGlvbl9pbmZvX2JveCcsIHtcblx0XHRcdFx0J21pZ3JhdGlvbl90eXBlJzogd3BtZGJfbWlncmF0aW9uX3R5cGUoKSxcblx0XHRcdFx0J2xhc3RfbWlncmF0aW9uX3R5cGUnOiBsYXN0X3JlcGxhY2Vfc3dpdGNoXG5cdFx0XHR9ICk7XG5cdFx0fVxuXG5cdFx0Ly8gbW92ZSBhcm91bmQgdGV4dGFyZWEgZGVwZW5kaW5nIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBwdXNoL3B1bGwgb3B0aW9ucyBhcmUgc2VsZWN0ZWRcblx0XHR2YXIgJGNvbm5lY3Rpb25faW5mb19ib3ggPSAkKCAnLmNvbm5lY3Rpb24taW5mby13cmFwcGVyJyApO1xuXHRcdG1vdmVfY29ubmVjdGlvbl9pbmZvX2JveCgpO1xuXG5cdFx0JCggJy5taWdyYXRlLXNlbGVjdGlvbi5vcHRpb24tZ3JvdXAgaW5wdXRbdHlwZT1yYWRpb10nICkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblx0XHRcdG1vdmVfY29ubmVjdGlvbl9pbmZvX2JveCgpO1xuXHRcdFx0aWYgKCBjb25uZWN0aW9uX2VzdGFibGlzaGVkICkge1xuXHRcdFx0XHRjaGFuZ2VfcmVwbGFjZV92YWx1ZXMoKTtcblx0XHRcdH1cblx0XHRcdHdwbWRiLmZ1bmN0aW9ucy51cGRhdGVfbWlncmF0ZV9idXR0b25fdGV4dCgpO1xuXHRcdH0gKTtcblxuXHRcdGZ1bmN0aW9uIGNoYW5nZV9yZXBsYWNlX3ZhbHVlcygpIHtcblx0XHRcdHZhciBvbGRfdXJsID0gbnVsbDtcblx0XHRcdHZhciBvbGRfcGF0aCA9IG51bGw7XG5cdFx0XHRpZiAoIG51bGwgIT09IHdwbWRiLmNvbW1vbi5wcmV2aW91c19jb25uZWN0aW9uX2RhdGEgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB3cG1kYi5jb21tb24ucHJldmlvdXNfY29ubmVjdGlvbl9kYXRhICYmIHdwbWRiLmNvbW1vbi5wcmV2aW91c19jb25uZWN0aW9uX2RhdGEudXJsICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnVybCApIHtcblx0XHRcdFx0b2xkX3VybCA9IHJlbW92ZV9wcm90b2NvbCggd3BtZGIuY29tbW9uLnByZXZpb3VzX2Nvbm5lY3Rpb25fZGF0YS51cmwgKTtcblx0XHRcdFx0b2xkX3BhdGggPSB3cG1kYi5jb21tb24ucHJldmlvdXNfY29ubmVjdGlvbl9kYXRhLnBhdGg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpIHx8ICdzYXZlZmlsZScgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgKSB7XG5cdFx0XHRcdGlmICggJ3B1bGwnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoICkge1xuXHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cnICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR2YXIgb2xkX3ZhbCA9ICQoICcub2xkLXJlcGxhY2UtY29sIGlucHV0JywgdGhpcyApLnZhbCgpO1xuXHRcdFx0XHRcdFx0JCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCAkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCgpICk7XG5cdFx0XHRcdFx0XHQkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCggb2xkX3ZhbCApO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fSBlbHNlIGlmICggJ3B1c2gnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoICYmICdwdXNoJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSAmJiBudWxsICE9PSBvbGRfdXJsICYmIG51bGwgIT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cnICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR2YXIgb2xkX3ZhbCA9ICQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wYXRoICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF91cmwgKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCByZW1vdmVfcHJvdG9jb2woIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVzaF90YWJsZV9zZWxlY3QnICk7XG5cdFx0XHRcdCQoICcjc2VsZWN0LXBvc3QtdHlwZXMnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuZXhjbHVkZS1wb3N0LXR5cGVzLXdhcm5pbmcnICkuYWZ0ZXIoICRwdXNoX3Bvc3RfdHlwZV9zZWxlY3QgKTtcblx0XHRcdFx0ZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKTtcblx0XHRcdFx0JCggJyNzZWxlY3QtYmFja3VwJyApLnJlbW92ZSgpO1xuXHRcdFx0XHQkKCAnLmJhY2t1cC10YWJsZXMtd3JhcCcgKS5wcmVwZW5kKCAkcHVzaF9zZWxlY3RfYmFja3VwICk7XG5cdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgKSB7XG5cdFx0XHRcdGlmICggJycgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggfHwgJ3B1c2gnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoIHx8ICdzYXZlZmlsZScgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggKSB7XG5cdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdycgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHZhciBvbGRfdmFsID0gJCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoICQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCkgKTtcblx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCBvbGRfdmFsICk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggJiYgJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICYmIG51bGwgIT09IG9sZF91cmwgJiYgbnVsbCAhPT0gb2xkX3BhdGggKSB7XG5cdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdycgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHZhciBvbGRfdmFsID0gJCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucGF0aCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCBvbGRfdmFsID09PSBvbGRfdXJsICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS51cmwgKSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX3VwZGF0ZV9wdWxsX3RhYmxlX3NlbGVjdCcgKTtcblx0XHRcdFx0JCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS5yZW1vdmUoKTtcblx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5hZnRlciggJHB1bGxfcG9zdF90eXBlX3NlbGVjdCApO1xuXHRcdFx0XHRleGNsdWRlX3Bvc3RfdHlwZXNfd2FybmluZygpO1xuXHRcdFx0XHQkKCAnI3NlbGVjdC1iYWNrdXAnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdWxsX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdH1cblx0XHRcdGxhc3RfcmVwbGFjZV9zd2l0Y2ggPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXHRcdH1cblxuXHRcdC8vIGhpZGUgc2Vjb25kIHNlY3Rpb24gaWYgcHVsbCBvciBwdXNoIGlzIHNlbGVjdGVkIHdpdGggbm8gY29ubmVjdGlvbiBlc3RhYmxpc2hlZFxuXHRcdGlmICggKCAncHVsbCcgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgfHwgJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkgJiYgIWNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgKSB7XG5cdFx0XHQkKCAnLnN0ZXAtdHdvJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXHRcdH1cblxuXHRcdC8vIHNob3cgLyBoaWRlIEdVSUQgaGVscGVyIGRlc2NyaXB0aW9uXG5cdFx0JCggJy5nZW5lcmFsLWhlbHBlcicgKS5jbGljayggZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgaWNvbiA9ICQoIHRoaXMgKSxcblx0XHRcdFx0YnViYmxlID0gJCggdGhpcyApLm5leHQoKTtcblxuXHRcdFx0Ly8gQ2xvc2UgYW55IHRoYXQgYXJlIGFscmVhZHkgb3BlblxuXHRcdFx0JCggJy5oZWxwZXItbWVzc2FnZScgKS5ub3QoIGJ1YmJsZSApLmhpZGUoKTtcblxuXHRcdFx0dmFyIHBvc2l0aW9uID0gaWNvbi5wb3NpdGlvbigpO1xuXHRcdFx0aWYgKCBidWJibGUuaGFzQ2xhc3MoICdib3R0b20nICkgKSB7XG5cdFx0XHRcdGJ1YmJsZS5jc3MoIHtcblx0XHRcdFx0XHQnbGVmdCc6ICggcG9zaXRpb24ubGVmdCAtIGJ1YmJsZS53aWR0aCgpIC8gMiApICsgJ3B4Jyxcblx0XHRcdFx0XHQndG9wJzogKCBwb3NpdGlvbi50b3AgKyBpY29uLmhlaWdodCgpICsgOSApICsgJ3B4J1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRidWJibGUuY3NzKCB7XG5cdFx0XHRcdFx0J2xlZnQnOiAoIHBvc2l0aW9uLmxlZnQgKyBpY29uLndpZHRoKCkgKyA5ICkgKyAncHgnLFxuXHRcdFx0XHRcdCd0b3AnOiAoIHBvc2l0aW9uLnRvcCArIGljb24uaGVpZ2h0KCkgLyAyIC0gMTggKSArICdweCdcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXG5cdFx0XHRidWJibGUudG9nZ2xlKCk7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuaGVscGVyLW1lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuaGVscGVyLW1lc3NhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5zaG93LWVycm9ycy10b2dnbGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoIHRoaXMgKS5uZXh0KCAnLm1pZ3JhdGlvbi1waHAtZXJyb3JzJyApLnRvZ2dsZSgpO1xuXHRcdH0gKTtcblxuXHRcdC8qKlxuXHRcdCAqIENvcmUgcGx1Z2luIHdyYXBwZXIgZm9yIHRoZSBjb21tb24gQUpBWCBlcnJvciBkZXRlY3RpbmcgbWV0aG9kXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gdGV4dFxuXHRcdCAqIEBwYXJhbSBjb2RlXG5cdFx0ICogQHBhcmFtIGpxWEhSXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldF9hamF4X2Vycm9ycyggdGV4dCwgY29kZSwganFYSFIgKSB7XG5cdFx0XHRyZXR1cm4gd3BtZGJHZXRBamF4RXJyb3JzKCB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25fbG9jYWxfc2VydmVyX3Byb2JsZW0sIGNvZGUsIHRleHQsIGpxWEhSICk7XG5cdFx0fVxuXG5cdFx0Ly8gbWlncmF0ZSAvIHNldHRpbmdzIHRhYnNcblx0XHQkKCAnLm5hdi10YWInICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhhc2ggPSAkKCB0aGlzICkuYXR0ciggJ2RhdGEtZGl2LW5hbWUnICk7XG5cdFx0XHRoYXNoID0gaGFzaC5yZXBsYWNlKCAnLXRhYicsICcnICk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG5cdFx0XHRzd2l0Y2hfdG9fcGx1Z2luX3RhYiggaGFzaCwgZmFsc2UgKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJ2FbaHJlZl49XCIjXCJdJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGhyZWYgPSAkKCBldmVudC50YXJnZXQgKS5hdHRyKCAnaHJlZicgKTtcblx0XHRcdHZhciB0YWJfbmFtZSA9IGhyZWYuc3Vic3RyKCAxICk7XG5cblx0XHRcdGlmICggdGFiX25hbWUgKSB7XG5cdFx0XHRcdHZhciBuYXZfdGFiID0gJCggJy4nICsgdGFiX25hbWUgKTtcblx0XHRcdFx0aWYgKCAxID09PSBuYXZfdGFiLmxlbmd0aCApIHtcblx0XHRcdFx0XHRuYXZfdGFiLnRyaWdnZXIoICdjbGljaycgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0Ly8gcmVwZWF0YWJsZSBmaWVsZHNcblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5hZGQtcm93JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJHBhcmVudF90ciA9ICQoIHRoaXMgKS5wYXJlbnRzKCAndHInICk7XG5cdFx0XHQkcGFyZW50X3RyLmJlZm9yZSggJCggJy5vcmlnaW5hbC1yZXBlYXRhYmxlLWZpZWxkJyApLmNsb25lKCkucmVtb3ZlQ2xhc3MoICdvcmlnaW5hbC1yZXBlYXRhYmxlLWZpZWxkJyApICk7XG5cdFx0XHQkcGFyZW50X3RyLnByZXYoKS5maW5kKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcgKS5mb2N1cygpO1xuXHRcdH0gKTtcblxuXHRcdC8vIHJlcGVhdGFibGUgZmllbGRzXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcucmVwbGFjZS1yZW1vdmUtcm93JywgZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50cyggJ3RyJyApLnJlbW92ZSgpO1xuXHRcdFx0aWYgKCAyID49ICQoICcucmVwbGFjZS1yb3cnICkubGVuZ3RoICkge1xuXHRcdFx0XHQkKCAnLm5vLXJlcGxhY2VzLW1lc3NhZ2UnICkuc2hvdygpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcHJldl9pZCA9ICQoIHRoaXMgKS5wcmV2KCkuYXR0ciggJ2lkJyApO1xuXHRcdFx0aWYgKCAnbmV3LXVybCcgPT09IHByZXZfaWQgfHwgJ25ldy1wYXRoJyA9PT0gcHJldl9pZCApIHtcblx0XHRcdFx0JCggJyMnICsgcHJldl9pZCArICctbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyBIaWRlIE5ldyBVUkwgJiBOZXcgUGF0aCBXYXJuaW5ncyBvbiBjaGFuZ2UuXG5cdFx0JCggJ2JvZHknIClcblx0XHRcdC5vbiggJ2NoYW5nZScsICcjbmV3LXVybCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI25ldy11cmwtbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblx0XHRcdH0gKVxuXHRcdFx0Lm9uKCAnY2hhbmdlJywgJyNuZXctcGF0aCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9ICk7XG5cblx0XHQvLyBDb3B5IEZpbmQgZmllbGQgdG8gYXNzb2NpYXRlZCBSZXBsYWNlIGZpZWxkIG9uIGFycm93IGNsaWNrLlxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmFycm93LWNvbCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJlcGxhY2Vfcm93X2Fycm93ID0gdGhpcztcblxuXHRcdFx0aWYgKCAkKCByZXBsYWNlX3Jvd19hcnJvdyApLmhhc0NsYXNzKCAnZGlzYWJsZWQnICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIG9yaWdpbmFsX3ZhbHVlID0gJCggcmVwbGFjZV9yb3dfYXJyb3cgKS5wcmV2KCAndGQnICkuZmluZCggJ2lucHV0JyApLnZhbCgpO1xuXHRcdFx0dmFyIG5ld192YWx1ZV9pbnB1dCA9ICQoIHJlcGxhY2Vfcm93X2Fycm93ICkubmV4dCggJ3RkJyApLmZpbmQoICdpbnB1dCcgKTtcblx0XHRcdG5ld192YWx1ZV9pbnB1dC52YWwoIG9yaWdpbmFsX3ZhbHVlICk7XG5cblx0XHRcdC8vIEhpZGUgTmV3IFVSTCBvciBOZXcgUGF0aCBXYXJuaW5nIGlmIGNoYW5nZWQuXG5cdFx0XHRpZiAoICduZXctdXJsJyA9PT0gbmV3X3ZhbHVlX2lucHV0LnByb3AoICdpZCcgKSApIHtcblx0XHRcdFx0JCggJyNuZXctdXJsLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKCAnbmV3LXBhdGgnID09PSBuZXdfdmFsdWVfaW5wdXQucHJvcCggJ2lkJyApICkge1xuXHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0JCggJy5hZGQtcmVwbGFjZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnJlcGxhY2UtZmllbGRzJyApLnByZXBlbmQoICQoICcub3JpZ2luYWwtcmVwZWF0YWJsZS1maWVsZCcgKS5jbG9uZSgpLnJlbW92ZUNsYXNzKCAnb3JpZ2luYWwtcmVwZWF0YWJsZS1maWVsZCcgKSApO1xuXHRcdFx0JCggJy5uby1yZXBsYWNlcy1tZXNzYWdlJyApLmhpZGUoKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnI2ZpbmQtYW5kLXJlcGxhY2Utc29ydCB0Ym9keScgKS5zb3J0YWJsZSgge1xuXHRcdFx0aXRlbXM6ICc+IHRyOm5vdCgucGluKScsXG5cdFx0XHRoYW5kbGU6ICd0ZDpmaXJzdCcsXG5cdFx0XHRzdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy13ZWJraXQtZ3JhYmJpbmcnICk7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy1tb3otZ3JhYmJpbmcnICk7XG5cdFx0XHR9LFxuXHRcdFx0c3RvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy13ZWJraXQtZ3JhYicgKTtcblx0XHRcdFx0JCggJy5zb3J0LWhhbmRsZScgKS5jc3MoICdjdXJzb3InLCAnLW1vei1ncmFiJyApO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlX3VybCggdXJsICkge1xuXHRcdFx0cmV0dXJuIC9eKFthLXpdKFthLXpdfFxcZHxcXCt8LXxcXC4pKik6KFxcL1xcLygoKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKFxcWyh8KHZbXFxkYS1mXXsxLH1cXC4oKFthLXpdfFxcZHwtfFxcLnxffH4pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKykpXFxdKXwoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XSkqKSg6XFxkKik/KShcXC8oKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSp8KFxcLygoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KXwoKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKyhcXC8oKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSopfCgoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkpezB9KShcXD8oKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KFxcIygoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8XFwvfFxcPykqKT8kL2kudGVzdCggdXJsICk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3dpdGNoX3RvX3BsdWdpbl90YWIoIGhhc2gsIHNraXBfYWRkb25zX2NoZWNrICkge1xuXHRcdFx0JCggJy5uYXYtdGFiJyApLnJlbW92ZUNsYXNzKCAnbmF2LXRhYi1hY3RpdmUnICk7XG5cdFx0XHQkKCAnLm5hdi10YWIuJyArIGhhc2ggKS5hZGRDbGFzcyggJ25hdi10YWItYWN0aXZlJyApO1xuXHRcdFx0JCggJy5jb250ZW50LXRhYicgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLicgKyBoYXNoICsgJy10YWInICkuc2hvdygpO1xuXG5cdFx0XHRpZiAoICdzZXR0aW5ncycgPT09IGhhc2ggKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gc2hvdWxkX2NoZWNrX2xpY2VuY2UoKSApIHtcblx0XHRcdFx0XHQkKCAncC5saWNlbmNlLXN0YXR1cycgKS5hcHBlbmQoICdDaGVja2luZyBMaWNlbnNlLi4uICcgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0XHRcdGNoZWNrX2xpY2VuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICdoZWxwJyA9PT0gaGFzaCApIHtcblx0XHRcdFx0cmVmcmVzaF9kZWJ1Z19sb2coKTtcblx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG91bGRfY2hlY2tfbGljZW5jZSgpICkge1xuXHRcdFx0XHRcdCQoICcuc3VwcG9ydC1jb250ZW50IHAnICkuYXBwZW5kKCBhamF4X3NwaW5uZXIgKTtcblx0XHRcdFx0XHRjaGVja19saWNlbmNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCAnYWRkb25zJyA9PT0gaGFzaCAmJiB0cnVlICE9PSBza2lwX2FkZG9uc19jaGVjayApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG91bGRfY2hlY2tfbGljZW5jZSgpICkge1xuXHRcdFx0XHRcdCQoICcuYWRkb25zLWNvbnRlbnQgcCcgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0XHRcdGNoZWNrX2xpY2VuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNob3VsZF9jaGVja19saWNlbmNlKCkge1xuXHRcdFx0aWYgKCBmYWxzZSA9PT0gY2hlY2tlZF9saWNlbmNlICYmICcxJyA9PT0gd3BtZGJfZGF0YS5oYXNfbGljZW5jZSAmJiAndHJ1ZScgPT09IHdwbWRiX2RhdGEuaXNfcHJvICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgaGFzaCA9ICcnO1xuXG5cdFx0Ly8gY2hlY2sgZm9yIGhhc2ggaW4gdXJsIChzZXR0aW5ncyB8fCBtaWdyYXRlKSBzd2l0Y2ggdGFicyBhY2NvcmRpbmdseVxuXHRcdGlmICggd2luZG93LmxvY2F0aW9uLmhhc2ggKSB7XG5cdFx0XHRoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKCAxICk7XG5cdFx0XHRzd2l0Y2hfdG9fcGx1Z2luX3RhYiggaGFzaCwgZmFsc2UgKTtcblx0XHR9XG5cblx0XHRpZiAoICcnICE9PSBnZXRfcXVlcnlfdmFyKCAnaW5zdGFsbC1wbHVnaW4nICkgKSB7XG5cdFx0XHRoYXNoID0gJ2FkZG9ucyc7XG5cdFx0XHRjaGVja2VkX2xpY2VuY2UgPSB0cnVlO1xuXHRcdFx0c3dpdGNoX3RvX3BsdWdpbl90YWIoIGhhc2gsIHRydWUgKTtcblx0XHR9XG5cblx0XHQvLyBwcm9jZXNzIG5vdGljZSBsaW5rcyBjbGlja3MsIGVnLiBkaXNtaXNzLCByZW1pbmRlclxuXHRcdCQoICcubm90aWNlLWxpbmsnICkuY2xpY2soIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCggdGhpcyApLmNsb3Nlc3QoICcuaW5saW5lLW1lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9wcm9jZXNzX25vdGljZV9saW5rJyxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMucHJvY2Vzc19ub3RpY2VfbGluayxcblx0XHRcdFx0XHRub3RpY2U6ICQoIHRoaXMgKS5kYXRhKCAnbm90aWNlJyApLFxuXHRcdFx0XHRcdHR5cGU6ICQoIHRoaXMgKS5kYXRhKCAndHlwZScgKSxcblx0XHRcdFx0XHRyZW1pbmRlcjogJCggdGhpcyApLmRhdGEoICdyZW1pbmRlcicgKVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gcmVnZW5lcmF0ZXMgdGhlIHNhdmVkIHNlY3JldCBrZXlcblx0XHQkKCAnLnJlc2V0LWFwaS1rZXknICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFuc3dlciA9IGNvbmZpcm0oIHdwbWRiX3N0cmluZ3MucmVzZXRfYXBpX2tleSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgfHwgZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGRvaW5nX3Jlc2V0X2FwaV9rZXlfYWpheCA9IHRydWU7XG5cdFx0XHQkKCAnLnJlc2V0LWFwaS1rZXknICkuYWZ0ZXIoICc8aW1nIHNyYz1cIicgKyBzcGlubmVyX3VybCArICdcIiBhbHQ9XCJcIiBjbGFzcz1cInJlc2V0LWFwaS1rZXktYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JyApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3Jlc2V0X2FwaV9rZXknLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5yZXNldF9hcGlfa2V5XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnJlc2V0X2FwaV9rZXlfcHJvYmxlbSApO1xuXHRcdFx0XHRcdCQoICcucmVzZXQtYXBpLWtleS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcucmVzZXQtYXBpLWtleS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLWluZm8nICkuaHRtbCggZGF0YSApO1xuXHRcdFx0XHRcdHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCBkYXRhICkuc3BsaXQoICdcXG4nICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdH0gKTtcblxuXHRcdC8vIHNob3cgLyBoaWRlIHRhYmxlIHNlbGVjdCBib3ggd2hlbiBzcGVjaWZpYyBzZXR0aW5ncyBjaGFuZ2Vcblx0XHQkKCAnaW5wdXQubXVsdGlzZWxlY3QtdG9nZ2xlJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50cyggJy5leHBhbmRhYmxlLWNvbnRlbnQnICkuY2hpbGRyZW4oICcuc2VsZWN0LXdyYXAnICkudG9nZ2xlKCk7XG5cdFx0fSApO1xuXG5cdFx0JCggJy5zaG93LW11bHRpc2VsZWN0JyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAkKCB0aGlzICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudHMoICcub3B0aW9uLXNlY3Rpb24nICkuY2hpbGRyZW4oICcuaGVhZGVyLWV4cGFuZC1jb2xsYXBzZScgKS5jaGlsZHJlbiggJy5leHBhbmQtY29sbGFwc2UtYXJyb3cnICkucmVtb3ZlQ2xhc3MoICdjb2xsYXBzZWQnICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnRzKCAnLmV4cGFuZGFibGUtY29udGVudCcgKS5zaG93KCk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnRzKCAnLmV4cGFuZGFibGUtY29udGVudCcgKS5jaGlsZHJlbiggJy5zZWxlY3Qtd3JhcCcgKS50b2dnbGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQkKCAnaW5wdXRbbmFtZT1iYWNrdXBfb3B0aW9uXScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5iYWNrdXAtdGFibGVzLXdyYXAnICkuaGlkZSgpO1xuXHRcdFx0aWYgKCAnYmFja3VwX21hbnVhbF9zZWxlY3QnID09PSAkKCB0aGlzICkudmFsKCkgKSB7XG5cdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnNob3coKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHRpZiAoICQoICcjYmFja3VwLW1hbnVhbC1zZWxlY3QnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnNob3coKTtcblx0XHR9XG5cblx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXNhdmUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQkKCB0aGlzICkuYWRkQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdHZhciBzZWxlY3RfZWxlbWVudCA9ICQoICcjc2VsZWN0ZWQtcGx1Z2lucycgKTtcblx0XHRcdCQoIHNlbGVjdF9lbGVtZW50ICkuYXR0ciggJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyApO1xuXG5cdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXN1Y2Nlc3MtbXNnJyApLnJlbW92ZSgpO1xuXG5cdFx0XHRkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ID0gdHJ1ZTtcblx0XHRcdCQoIHRoaXMgKS5hZnRlciggJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwicGx1Z2luLWNvbXBhdGliaWxpdHktc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPicgKTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9ibGFja2xpc3RfcGx1Z2lucycsXG5cdFx0XHRcdFx0YmxhY2tsaXN0X3BsdWdpbnM6ICQoIHNlbGVjdF9lbGVtZW50ICkudmFsKClcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MuYmxhY2tsaXN0X3Byb2JsZW0gKyAnXFxyXFxuXFxyXFxuJyArIHdwbWRiX3N0cmluZ3Muc3RhdHVzICsgJyAnICsganFYSFIuc3RhdHVzICsgJyAnICsganFYSFIuc3RhdHVzVGV4dCArICdcXHJcXG5cXHJcXG4nICsgd3BtZGJfc3RyaW5ncy5yZXNwb25zZSArICdcXHJcXG4nICsganFYSFIucmVzcG9uc2VUZXh0ICk7XG5cdFx0XHRcdFx0JCggc2VsZWN0X2VsZW1lbnQgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5wbHVnaW4tY29tcGF0aWJpbGl0eS1zYXZlJyApLnJlbW92ZUNsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0ZG9pbmdfcGx1Z2luX2NvbXBhdGliaWxpdHlfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gJC50cmltKCBkYXRhICkgKSB7XG5cdFx0XHRcdFx0XHRhbGVydCggZGF0YSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQkKCBzZWxlY3RfZWxlbWVudCApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXNhdmUnICkucmVtb3ZlQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5wbHVnaW4tY29tcGF0aWJpbGl0eS1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc2F2ZScgKS5hZnRlciggJzxzcGFuIGNsYXNzPVwicGx1Z2luLWNvbXBhdGliaWxpdHktc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc3VjY2Vzcy1tc2cnICkuZmFkZU91dCggMjAwMCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gZGVsZXRlIGEgcHJvZmlsZSBmcm9tIHRoZSBtaWdyYXRlIGZvcm0gYXJlYVxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmRlbGV0ZS1wcm9maWxlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmFtZSA9ICQoIHRoaXMgKS5uZXh0KCkuY2xvbmUoKTtcblx0XHRcdCQoICdpbnB1dCcsIG5hbWUgKS5yZW1vdmUoKTtcblx0XHRcdG5hbWUgPSAkLnRyaW0oICQoIG5hbWUgKS5odG1sKCkgKTtcblx0XHRcdHZhciBhbnN3ZXIgPSBjb25maXJtKCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlLnJlcGxhY2UoICd7e3Byb2ZpbGV9fScsIG5hbWUgKSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciAkcHJvZmlsZV9saSA9ICQoIHRoaXMgKS5wYXJlbnQoKTtcblxuXHRcdFx0aWYgKCAkcHJvZmlsZV9saS5maW5kKCAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0XHRcdHZhciAkbmV3X3Byb2ZpbGVfbGkgPSAkcHJvZmlsZV9saS5zaWJsaW5ncygpLmxhc3QoKTtcblx0XHRcdFx0JG5ld19wcm9maWxlX2xpLmZpbmQoICdpbnB1dFt0eXBlPXJhZGlvXScgKS5wcm9wKCAnY2hlY2tlZCcsICdjaGVja2VkJyApO1xuXHRcdFx0XHQkbmV3X3Byb2ZpbGVfbGkuZmluZCggJ2lucHV0W3R5cGU9dGV4dF0nICkuZm9jdXMoKTtcblx0XHRcdFx0JCggJyNtaWdyYXRlLWZvcm0gLmNydW1icyAuY3J1bWI6bGFzdCcgKS50ZXh0KCAnTmV3IFByb2ZpbGUnICk7XG5cblx0XHRcdFx0aWYgKCAnZnVuY3Rpb24nID09PSB0eXBlb2Ygd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICkge1xuXHRcdFx0XHRcdHZhciB1cGRhdGVkX3VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoICcjbWlncmF0ZScsICcnICkucmVwbGFjZSggLyZ3cG1kYi1wcm9maWxlPS0/XFxkKy8sICcnICkgKyAnJndwbWRiLXByb2ZpbGU9LTEnO1xuXHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSggeyB1cGRhdGVkX3Byb2ZpbGVfaWQ6IC0xIH0sIG51bGwsIHVwZGF0ZWRfdXJsICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JHByb2ZpbGVfbGkuZmFkZU91dCggNTAwICk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfZGVsZXRlX21pZ3JhdGlvbl9wcm9maWxlJyxcblx0XHRcdFx0XHRwcm9maWxlX2lkOiAkKCB0aGlzICkuYXR0ciggJ2RhdGEtcHJvZmlsZS1pZCcgKSxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuZGVsZXRlX21pZ3JhdGlvbl9wcm9maWxlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlX3Byb2JsZW0gKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCAnLTEnID09PSBkYXRhICkge1xuXHRcdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MucmVtb3ZlX3Byb2ZpbGVfbm90X2ZvdW5kICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHQvLyBkZWxldGVzIGEgcHJvZmlsZSBmcm9tIHRoZSBtYWluIHByb2ZpbGUgc2VsZWN0aW9uIHNjcmVlblxuXHRcdCQoICcubWFpbi1saXN0LWRlbGV0ZS1wcm9maWxlLWxpbmsnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5hbWUgPSAkKCB0aGlzICkucHJldigpLmh0bWwoKTtcblx0XHRcdHZhciBhbnN3ZXIgPSBjb25maXJtKCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlLnJlcGxhY2UoICd7e3Byb2ZpbGV9fScsIG5hbWUgKSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZhZGVPdXQoIDUwMCApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2RlbGV0ZV9taWdyYXRpb25fcHJvZmlsZScsXG5cdFx0XHRcdFx0cHJvZmlsZV9pZDogJCggdGhpcyApLmF0dHIoICdkYXRhLXByb2ZpbGUtaWQnICksXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmRlbGV0ZV9taWdyYXRpb25fcHJvZmlsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5yZW1vdmVfcHJvZmlsZV9wcm9ibGVtICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdH0gKTtcblxuXHRcdC8vIHdhcm4gdGhlIHVzZXIgd2hlbiBlZGl0aW5nIHRoZSBjb25uZWN0aW9uIGluZm8gYWZ0ZXIgYSBjb25uZWN0aW9uIGhhcyBiZWVuIGVzdGFibGlzaGVkXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudGVtcC1kaXNhYmxlZCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFuc3dlciA9IGNvbmZpcm0oIHdwbWRiX3N0cmluZ3MuY2hhbmdlX2Nvbm5lY3Rpb25faW5mbyApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuc3NsLW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcuZGlmZmVyZW50LXBsdWdpbi12ZXJzaW9uLW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcubWlncmF0ZS1kYi1idXR0b24nICkuc2hvdygpO1xuXHRcdFx0XHQkKCAnLnRlbXAtZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ3JlYWRvbmx5JyApO1xuXHRcdFx0XHQkKCAnLnRlbXAtZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICd0ZW1wLWRpc2FibGVkJyApO1xuXHRcdFx0XHQkKCAnLmNvbm5lY3QtYnV0dG9uJyApLnNob3coKTtcblx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpLmh0bWwoIHdwbWRiX3N0cmluZ3MuZW50ZXJfY29ubmVjdGlvbl9pbmZvICk7XG5cdFx0XHRcdGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyBhamF4IHJlcXVlc3QgZm9yIHNldHRpbmdzIHBhZ2Ugd2hlbiBjaGVja2luZy91bmNoZWNraW5nIHNldHRpbmcgcmFkaW8gYnV0dG9uc1xuXHRcdCQoICcuc2V0dGluZ3MtdGFiIGlucHV0W3R5cGU9Y2hlY2tib3hdJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICdwbHVnaW4tY29tcGF0aWJpbGl0eScgPT09ICQoIHRoaXMgKS5hdHRyKCAnaWQnICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBjaGVja2VkID0gJCggdGhpcyApLmlzKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgc2V0dGluZyA9ICQoIHRoaXMgKS5hdHRyKCAnaWQnICk7XG5cdFx0XHR2YXIgJHN0YXR1cyA9ICQoIHRoaXMgKS5jbG9zZXN0KCAndGQnICkubmV4dCggJ3RkJyApLmZpbmQoICcuc2V0dGluZy1zdGF0dXMnICk7XG5cblx0XHRcdCQoICcuYWpheC1zdWNjZXNzLW1zZycgKS5yZW1vdmUoKTtcblx0XHRcdCRzdGF0dXMuYWZ0ZXIoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3NhdmVfc2V0dGluZycsXG5cdFx0XHRcdFx0Y2hlY2tlZDogY2hlY2tlZCxcblx0XHRcdFx0XHRzZXR0aW5nOiBzZXR0aW5nLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5zYXZlX3NldHRpbmdcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3Muc2F2ZV9zZXR0aW5nc19wcm9ibGVtICk7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCRzdGF0dXMuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJhamF4LXN1Y2Nlc3MtbXNnXCI+JyArIHdwbWRiX3N0cmluZ3Muc2F2ZWQgKyAnPC9zcGFuPicgKTtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3VjY2Vzcy1tc2cnICkuZmFkZU91dCggMjAwMCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHQvLyBkaXNhYmxlIGZvcm0gc3VibWlzc2lvbnNcblx0XHQkKCAnLm1pZ3JhdGUtZm9ybScgKS5zdWJtaXQoIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0gKTtcblxuXHRcdC8vIGZpcmUgY29ubmVjdGlvbl9ib3hfY2hhbmdlZCB3aGVuIHRoZSBjb25uZWN0IGJ1dHRvbiBpcyBwcmVzc2VkXG5cdFx0JCggJy5jb25uZWN0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoIHRoaXMgKS5ibHVyKCk7XG5cdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gc2VuZCBwYXN0ZSBldmVuIHRvIGNvbm5lY3Rpb25fYm94X2NoYW5nZWQoKSBmdW5jdGlvblxuXHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5iaW5kKCAncGFzdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdHZhciAkdGhpcyA9IHRoaXM7XG5cdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29ubmVjdGlvbl9ib3hfY2hhbmdlZCgpO1xuXHRcdFx0fSwgMCApO1xuXG5cdFx0fSApO1xuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudHJ5LWFnYWluJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0fSApO1xuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudHJ5LWh0dHAnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjb25uZWN0aW9uX2luZm8gPSAkLnRyaW0oICQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoKSApLnNwbGl0KCAnXFxuJyApO1xuXHRcdFx0dmFyIG5ld191cmwgPSBjb25uZWN0aW9uX2luZm9bIDAgXS5yZXBsYWNlKCAnaHR0cHMnLCAnaHR0cCcgKTtcblx0XHRcdHZhciBuZXdfY29udGVudHMgPSBuZXdfdXJsICsgJ1xcbicgKyBjb25uZWN0aW9uX2luZm9bIDEgXTtcblx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoIG5ld19jb250ZW50cyApO1xuXHRcdFx0Y29ubmVjdGlvbl9ib3hfY2hhbmdlZCgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRwcm9maWxlX25hbWVfZWRpdGVkID0gdHJ1ZTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy50ZW1wb3JhcmlseS1kaXNhYmxlLXNzbCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhhc2ggPSAnJztcblx0XHRcdGlmICggd2luZG93LmxvY2F0aW9uLmhhc2ggKSB7XG5cdFx0XHRcdGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoIDEgKTtcblx0XHRcdH1cblx0XHRcdCQoIHRoaXMgKS5hdHRyKCAnaHJlZicsICQoIHRoaXMgKS5hdHRyKCAnaHJlZicgKSArICcmaGFzaD0nICsgaGFzaCApO1xuXHRcdH0gKTtcblxuXHRcdC8vIGZpcmVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gaW5mbyBib3ggY2hhbmdlcyAoZS5nLiBnZXRzIHBhc3RlZCBpbnRvKVxuXHRcdGZ1bmN0aW9uIGNvbm5lY3Rpb25fYm94X2NoYW5nZWQoIGRhdGEgKSB7XG5cdFx0XHR2YXIgJHRoaXMgPSAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICk7XG5cblx0XHRcdGlmICggZG9pbmdfYWpheCB8fCAkKCAkdGhpcyApLmhhc0NsYXNzKCAndGVtcC1kaXNhYmxlZCcgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRkYXRhID0gJCggJy5wdWxsLXB1c2gtY29ubmVjdGlvbi1pbmZvJyApLnZhbCgpO1xuXG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCBkYXRhICkuc3BsaXQoICdcXG4nICk7XG5cdFx0XHR2YXIgZXJyb3IgPSBmYWxzZTtcblx0XHRcdHZhciBlcnJvcl9tZXNzYWdlID0gJyc7XG5cblx0XHRcdGlmICggJycgPT09IGNvbm5lY3Rpb25faW5mbyApIHtcblx0XHRcdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRlcnJvcl9tZXNzYWdlID0gd3BtZGJfc3RyaW5ncy5jb25uZWN0aW9uX2luZm9fbWlzc2luZztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAyICE9PSBjb25uZWN0aW9uX2luZm8ubGVuZ3RoICYmICFlcnJvciApIHtcblx0XHRcdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRlcnJvcl9tZXNzYWdlID0gd3BtZGJfc3RyaW5ncy5jb25uZWN0aW9uX2luZm9faW5jb3JyZWN0O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICFlcnJvciAmJiAhdmFsaWRhdGVfdXJsKCBjb25uZWN0aW9uX2luZm9bIDAgXSApICkge1xuXHRcdFx0XHRlcnJvciA9IHRydWU7XG5cdFx0XHRcdGVycm9yX21lc3NhZ2UgPSB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25faW5mb191cmxfaW52YWxpZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgMzIgPj0gY29ubmVjdGlvbl9pbmZvWyAxIF0ubGVuZ3RoICkge1xuXHRcdFx0XHRlcnJvciA9IHRydWU7XG5cdFx0XHRcdGVycm9yX21lc3NhZ2UgPSB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25faW5mb19rZXlfaW52YWxpZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgY29ubmVjdGlvbl9pbmZvWyAwIF0gPT09IHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvWyAwIF0gKSB7XG5cdFx0XHRcdGVycm9yID0gdHJ1ZTtcblx0XHRcdFx0ZXJyb3JfbWVzc2FnZSA9IHdwbWRiX3N0cmluZ3MuY29ubmVjdGlvbl9pbmZvX2xvY2FsX3VybDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgY29ubmVjdGlvbl9pbmZvWyAxIF0gPT09IHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvWyAxIF0gKSB7XG5cdFx0XHRcdGVycm9yID0gdHJ1ZTtcblx0XHRcdFx0ZXJyb3JfbWVzc2FnZSA9IHdwbWRiX3N0cmluZ3MuY29ubmVjdGlvbl9pbmZvX2xvY2FsX2tleTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCBlcnJvciApIHtcblx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5odG1sKCBlcnJvcl9tZXNzYWdlICk7XG5cdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzID0gY29ubmVjdGlvbl9pbmZvWyAwIF0gKyAnXFxuJyArIGNvbm5lY3Rpb25faW5mb1sgMSBdO1xuXG5cdFx0XHRpZiAoIGZhbHNlID09PSB3cG1kYl9kYXRhLm9wZW5zc2xfYXZhaWxhYmxlICkge1xuXHRcdFx0XHRjb25uZWN0aW9uX2luZm9bIDAgXSA9IGNvbm5lY3Rpb25faW5mb1sgMCBdLnJlcGxhY2UoICdodHRwczovLycsICdodHRwOi8vJyApO1xuXHRcdFx0XHRuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzID0gY29ubmVjdGlvbl9pbmZvWyAwIF0gKyAnXFxuJyArIGNvbm5lY3Rpb25faW5mb1sgMSBdO1xuXHRcdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCBuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzICk7XG5cdFx0XHR9XG5cblx0XHRcdHNob3dfcHJlZml4X25vdGljZSA9IGZhbHNlO1xuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRkaXNhYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCk7XG5cblx0XHRcdGlmICggJCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLmlzKCAnOnZpc2libGUnICkgKSB7XG5cdFx0XHRcdGNvbm5lY3Rpb25faW5mb1sgMCBdID0gY29ubmVjdGlvbl9pbmZvWyAwIF0ucmVwbGFjZSggL1xcL1xcLyguKilALywgJy8vJyApO1xuXHRcdFx0XHRjb25uZWN0aW9uX2luZm9bIDAgXSA9IGNvbm5lY3Rpb25faW5mb1sgMCBdLnJlcGxhY2UoICcvLycsICcvLycgKyBlbmNvZGVVUklDb21wb25lbnQoICQudHJpbSggJCggJy5hdXRoLXVzZXJuYW1lJyApLnZhbCgpICkgKSArICc6JyArIGVuY29kZVVSSUNvbXBvbmVudCggJC50cmltKCAkKCAnLmF1dGgtcGFzc3dvcmQnICkudmFsKCkgKSApICsgJ0AnICk7XG5cdFx0XHRcdG5ld19jb25uZWN0aW9uX2luZm9fY29udGVudHMgPSBjb25uZWN0aW9uX2luZm9bIDAgXSArICdcXG4nICsgY29ubmVjdGlvbl9pbmZvWyAxIF07XG5cdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoIG5ld19jb25uZWN0aW9uX2luZm9fY29udGVudHMgKTtcblx0XHRcdFx0JCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLmhpZGUoKTtcblx0XHRcdH1cblxuXHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5wcmVmaXgtbm90aWNlJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MuZXN0YWJsaXNoaW5nX3JlbW90ZV9jb25uZWN0aW9uICk7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLnJlbW92ZUNsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYXBwZW5kKCBhamF4X3NwaW5uZXIgKTtcblxuXHRcdFx0dmFyIGludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cblx0XHRcdHByb2ZpbGVfbmFtZV9lZGl0ZWQgPSBmYWxzZTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ2pzb24nLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl92ZXJpZnlfY29ubmVjdGlvbl90b19yZW1vdGVfc2l0ZScsXG5cdFx0XHRcdFx0dXJsOiBjb25uZWN0aW9uX2luZm9bIDAgXSxcblx0XHRcdFx0XHRrZXk6IGNvbm5lY3Rpb25faW5mb1sgMSBdLFxuXHRcdFx0XHRcdGludGVudDogaW50ZW50LFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy52ZXJpZnlfY29ubmVjdGlvbl90b19yZW1vdGVfc2l0ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxMDApJywganFYSFIgKSApO1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRlbmFibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXHRcdFx0XHRcdG1heWJlX3Nob3dfc3NsX3dhcm5pbmcoIGNvbm5lY3Rpb25faW5mb1sgMCBdLCBjb25uZWN0aW9uX2luZm9bIDEgXSwgZGF0YS5zY2hlbWUgKTtcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLndwbWRiX2Vycm9yICYmIDEgPT09IGRhdGEud3BtZGJfZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGRhdGEuYm9keSApO1xuXHRcdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5hZGRDbGFzcyggJ25vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZSBtaWdyYXRpb24tZXJyb3InICk7XG5cblx0XHRcdFx0XHRcdGlmICggZGF0YS5ib2R5LmluZGV4T2YoICc0MDEgVW5hdXRob3JpemVkJyApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcuYmFzaWMtYWNjZXNzLWF1dGgtd3JhcHBlcicgKS5zaG93KCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgcHJvZmlsZV9uYW1lID0gZ2V0X2RvbWFpbl9uYW1lKCBkYXRhLnVybCApO1xuXHRcdFx0XHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLnZhbCggcHJvZmlsZV9uYW1lICk7XG5cblx0XHRcdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkuYWRkQ2xhc3MoICd0ZW1wLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5hdHRyKCAncmVhZG9ubHknLCAncmVhZG9ubHknICk7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0LWJ1dHRvbicgKS5oaWRlKCk7XG5cblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdFx0XHQkKCAnLnN0ZXAtdHdvJyApLnNob3coKTtcblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfcHJlZml4X25vdGljZSggZGF0YS5wcmVmaXggKTtcblxuXHRcdFx0XHRcdGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNldF9jb25uZWN0aW9uX2RhdGEoIGRhdGEgKTtcblx0XHRcdFx0XHRtb3ZlX2Nvbm5lY3Rpb25faW5mb19ib3goKTtcblx0XHRcdFx0XHRjaGFuZ2VfcmVwbGFjZV92YWx1ZXMoKTtcblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCk7XG5cblx0XHRcdFx0XHRyZWZyZXNoX3RhYmxlX3NlbGVjdHMoKTtcblxuXHRcdFx0XHRcdCRwdXNoX3NlbGVjdF9iYWNrdXAgPSAkKCAkcHVsbF9zZWxlY3QgKS5jbG9uZSgpO1xuXHRcdFx0XHRcdCQoICRwdXNoX3NlbGVjdF9iYWNrdXAgKS5hdHRyKCB7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2VsZWN0X2JhY2t1cFtdJyxcblx0XHRcdFx0XHRcdGlkOiAnc2VsZWN0LWJhY2t1cCdcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHR2YXIgJHBvc3RfdHlwZV9zZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnc2VsZWN0JyApO1xuXHRcdFx0XHRcdCQoICRwb3N0X3R5cGVfc2VsZWN0ICkuYXR0cigge1xuXHRcdFx0XHRcdFx0bXVsdGlwbGU6ICdtdWx0aXBsZScsXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2VsZWN0X3Bvc3RfdHlwZXNbXScsXG5cdFx0XHRcdFx0XHRpZDogJ3NlbGVjdC1wb3N0LXR5cGVzJyxcblx0XHRcdFx0XHRcdGNsYXNzOiAnbXVsdGlzZWxlY3QnXG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0JC5lYWNoKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnBvc3RfdHlwZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHQkKCAkcG9zdF90eXBlX3NlbGVjdCApLmFwcGVuZCggJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUgKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPicgKTtcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkcHVsbF9wb3N0X3R5cGVfc2VsZWN0ID0gJHBvc3RfdHlwZV9zZWxlY3Q7XG5cblx0XHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZywgI25ldy11cmwtbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblxuXHRcdFx0XHRcdGlmICggJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHRcdFx0JCggJyNuZXctdXJsJyApLnZhbCggcmVtb3ZlX3Byb3RvY29sKCB3cG1kYl9kYXRhLnRoaXNfdXJsICkgKTtcblx0XHRcdFx0XHRcdCQoICcjbmV3LXBhdGgnICkudmFsKCB3cG1kYl9kYXRhLnRoaXNfcGF0aCApO1xuXHRcdFx0XHRcdFx0aWYgKCAndHJ1ZScgPT09IHdwbWRiX2RhdGEuaXNfbXVsdGlzaXRlICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnI25ldy1kb21haW4nICkudmFsKCB3cG1kYl9kYXRhLnRoaXNfZG9tYWluICk7XG5cdFx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cucGluIC5vbGQtcmVwbGFjZS1jb2wgaW5wdXRbdHlwZT1cInRleHRcIl0nICkudmFsKCByZW1vdmVfcHJvdG9jb2woIGRhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcjb2xkLXVybCcgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggZGF0YS51cmwgKSApO1xuXHRcdFx0XHRcdFx0JCggJyNvbGQtcGF0aCcgKS52YWwoIGRhdGEucGF0aCApO1xuXHRcdFx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QnICk7XG5cdFx0XHRcdFx0XHQkKCAnI3NlbGVjdC1wb3N0LXR5cGVzJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5hZnRlciggJHB1bGxfcG9zdF90eXBlX3NlbGVjdCApO1xuXHRcdFx0XHRcdFx0ZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKTtcblx0XHRcdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIGRhdGEucHJlZml4ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnVwbG9hZHMtZGlyJyApLmh0bWwoIHdwbWRiX2RhdGEudGhpc191cGxvYWRzX2RpciApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnI25ldy11cmwnICkudmFsKCByZW1vdmVfcHJvdG9jb2woIGRhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdCQoICcjbmV3LXBhdGgnICkudmFsKCBkYXRhLnBhdGggKTtcblx0XHRcdFx0XHRcdGlmICggJ3RydWUnID09PSB3cG1kYl9kYXRhLmlzX211bHRpc2l0ZSApIHtcblx0XHRcdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdy5waW4gLm9sZC1yZXBsYWNlLWNvbCBpbnB1dFt0eXBlPVwidGV4dFwiXScgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggd3BtZGJfZGF0YS50aGlzX3VybCApICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX3VwZGF0ZV9wdXNoX3RhYmxlX3NlbGVjdCcgKTtcblx0XHRcdFx0XHRcdCQoICcjc2VsZWN0LWJhY2t1cCcgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdXNoX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHtcblx0XHRcdFx0XHRcdGZuOiAkLndwbWRiLmRvX2FjdGlvbixcblx0XHRcdFx0XHRcdGFyZ3M6IFsgJ3ZlcmlmeV9jb25uZWN0aW9uX3RvX3JlbW90ZV9zaXRlJywgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSBdXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9ICk7XG5cblx0XHR9XG5cblx0XHQvLyBTZXRzIHRoZSBpbml0aWFsIFBhdXNlL1Jlc3VtZSBidXR0b24gZXZlbnQgdG8gUGF1c2Vcblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5wYXVzZS1yZXN1bWUnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRzZXRfcGF1c2VfcmVzdW1lX2J1dHRvbiggZXZlbnQgKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBjYW5jZWxfbWlncmF0aW9uKCBldmVudCApIHtcblx0XHRcdG1pZ3JhdGlvbl9jYW5jZWxsZWQgPSB0cnVlO1xuXHRcdFx0JCggJy5taWdyYXRpb24tY29udHJvbHMnICkuY3NzKCB7IHZpc2liaWxpdHk6ICdoaWRkZW4nIH0gKTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MuY2FuY2VsbGluZ19taWdyYXRpb24sIHdwbWRiX3N0cmluZ3MuY29tcGxldGluZ19jdXJyZW50X3JlcXVlc3QsICdjYW5jZWxsaW5nJyApO1xuXG5cdFx0XHRpZiAoIHRydWUgPT09IG1pZ3JhdGlvbl9wYXVzZWQgKSB7XG5cdFx0XHRcdG1pZ3JhdGlvbl9wYXVzZWQgPSBmYWxzZTtcblx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcuY2FuY2VsJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0Y2FuY2VsX21pZ3JhdGlvbiggZXZlbnQgKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnLmVudGVyLWxpY2VuY2UnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zZXR0aW5ncycgKS5jbGljaygpO1xuXHRcdFx0JCggJy5saWNlbmNlLWlucHV0JyApLmZvY3VzKCk7XG5cdFx0fSApO1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdC8vIGlmIGRlbGF5IGlzIHNldCwgc2V0IGEgdGltZW91dCBmb3IgZGVsYXkgdG8gcmVjYWxsIHRoaXMgZnVuY3Rpb24sIHRoZW4gcmV0dXJuXG5cdFx0XHRpZiAoIDAgPCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzICYmIGZhbHNlID09PSBmbGFnX3NraXBfZGVsYXkgKSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGZsYWdfc2tpcF9kZWxheSA9IHRydWU7XG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHRcdH0sIGRlbGF5X2JldHdlZW5fcmVxdWVzdHMgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmxhZ19za2lwX2RlbGF5ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX3BhdXNlZCApIHtcblx0XHRcdFx0JCggJy5taWdyYXRpb24tcHJvZ3Jlc3MtYWpheC1zcGlubmVyJyApLmhpZGUoKTtcblxuXHRcdFx0XHQvLyBQYXVzZSB0aGUgdGltZXJcblx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ucGF1c2VUaW1lcigpO1xuXG5cdFx0XHRcdHZhciBwYXVzZV90ZXh0ID0gJyc7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gaXNfYXV0b19wYXVzZV9iZWZvcmVfZmluYWxpemUgKSB7XG5cdFx0XHRcdFx0cGF1c2VfdGV4dCA9IHdwbWRiX3N0cmluZ3MucGF1c2VkX2JlZm9yZV9maW5hbGl6ZTtcblx0XHRcdFx0XHRpc19hdXRvX3BhdXNlX2JlZm9yZV9maW5hbGl6ZSA9IGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhdXNlX3RleHQgPSB3cG1kYl9zdHJpbmdzLnBhdXNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBudWxsLCBwYXVzZV90ZXh0LCAncGF1c2VkJyApO1xuXG5cdFx0XHRcdC8vIFJlLWJpbmQgUGF1c2UvUmVzdW1lIGJ1dHRvbiB0byBSZXN1bWUgd2hlbiB3ZSBhcmUgZmluYWxseSBQYXVzZWRcblx0XHRcdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcucGF1c2UtcmVzdW1lJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdHNldF9wYXVzZV9yZXN1bWVfYnV0dG9uKCBldmVudCApO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmNhbmNlbCcsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRjYW5jZWxfbWlncmF0aW9uKCBldmVudCApO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoICcucGF1c2UtcmVzdW1lJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MucmVzdW1lICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSBpZiAoIHRydWUgPT09IG1pZ3JhdGlvbl9jYW5jZWxsZWQgKSB7XG5cdFx0XHRcdG1pZ3JhdGlvbl9pbnRlbnQgPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXG5cdFx0XHRcdHZhciBwcm9ncmVzc19tc2c7XG5cblx0XHRcdFx0aWYgKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRcdHByb2dyZXNzX21zZyA9IHdwbWRiX3N0cmluZ3MucmVtb3ZpbmdfbG9jYWxfc3FsO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdFx0aWYgKCAnYmFja3VwJyA9PT0gc3RhZ2UgKSB7XG5cdFx0XHRcdFx0XHRwcm9ncmVzc19tc2cgPSB3cG1kYl9zdHJpbmdzLnJlbW92aW5nX2xvY2FsX2JhY2t1cDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NfbXNnID0gd3BtZGJfc3RyaW5ncy5yZW1vdmluZ19sb2NhbF90ZW1wX3RhYmxlcztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0XHRpZiAoICdiYWNrdXAnID09PSBzdGFnZSApIHtcblx0XHRcdFx0XHRcdHByb2dyZXNzX21zZyA9IHdwbWRiX3N0cmluZ3MucmVtb3ZpbmdfcmVtb3RlX3NxbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NfbXNnID0gd3BtZGJfc3RyaW5ncy5yZW1vdmluZ19yZW1vdGVfdGVtcF90YWJsZXM7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFRleHQoIHByb2dyZXNzX21zZyApO1xuXG5cdFx0XHRcdHZhciByZXF1ZXN0X2RhdGEgPSB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfY2FuY2VsX21pZ3JhdGlvbicsXG5cdFx0XHRcdFx0bWlncmF0aW9uX3N0YXRlX2lkOiB3cG1kYi5taWdyYXRpb25fc3RhdGVfaWRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRcdGRhdGE6IHJlcXVlc3RfZGF0YSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9jYW5jZWxsYXRpb25fZmFpbGVkLCB3cG1kYl9zdHJpbmdzLm1hbnVhbGx5X3JlbW92ZV90ZW1wX2ZpbGVzICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICc6ICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJzo8YnIgLz4nICsganFYSFIucmVzcG9uc2VUZXh0LCAnZXJyb3InICk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygganFYSFIgKTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCB0ZXh0U3RhdHVzICk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyggZXJyb3JUaHJvd24gKTtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0ZGF0YSA9ICQudHJpbSggZGF0YSApO1xuXHRcdFx0XHRcdFx0aWYgKCAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCAmJiAnMScgIT09IGRhdGEgKSB8fCAoICdwdXNoJyAhPT0gbWlncmF0aW9uX2ludGVudCAmJiAnJyAhPT0gZGF0YSApICkge1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggd3BtZGJfc3RyaW5ncy5taWdyYXRpb25fY2FuY2VsbGF0aW9uX2ZhaWxlZCwgZGF0YSwgJ2Vycm9yJyApO1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29tcGxldGVkX21zZyA9IHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NhbmNlbGxlZDtcblx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0dXMoICdjYW5jZWxsZWQnICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbi5mbi5hcHBseSggbnVsbCwgd3BtZGIuY29tbW9uLm5leHRfc3RlcF9pbl9taWdyYXRpb24uYXJncyApO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5jb3B5LWxpY2VuY2UtdG8tcmVtb3RlLXNpdGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggd3BtZGJfc3RyaW5ncy5jb3B5aW5nX2xpY2Vuc2UgKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkucmVtb3ZlQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblxuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRkaXNhYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfY29weV9saWNlbmNlX3RvX3JlbW90ZV9zaXRlJyxcblx0XHRcdFx0XHR1cmw6IGNvbm5lY3Rpb25faW5mb1sgMCBdLFxuXHRcdFx0XHRcdGtleTogY29ubmVjdGlvbl9pbmZvWyAxIF0sXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmNvcHlfbGljZW5jZV90b19yZW1vdGVfc2l0ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxNDMpJywganFYSFIgKSApO1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRlbmFibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEud3BtZGJfZXJyb3IgJiYgMSA9PT0gZGF0YS53cG1kYl9lcnJvciApIHtcblx0XHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmFkZENsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBkYXRhLmJvZHkuaW5kZXhPZiggJzQwMSBVbmF1dGhvcml6ZWQnICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0JCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLnNob3coKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5yZWFjdGl2YXRlLWxpY2VuY2UnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXG5cdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5lbXB0eSgpLmh0bWwoIHdwbWRiX3N0cmluZ3MuYXR0ZW1wdGluZ190b19hY3RpdmF0ZV9saWNlbmNlICk7XG5cdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3JlYWN0aXZhdGVfbGljZW5jZScsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnJlYWN0aXZhdGVfbGljZW5jZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5odG1sKCB3cG1kYl9zdHJpbmdzLmFjdGl2YXRlX2xpY2VuY2VfcHJvYmxlbSApO1xuXHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmFwcGVuZCggJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICc6ICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJzxiciAvPicgKyBqcVhIUi5yZXNwb25zZVRleHQgKTtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLndwbWRiX2Vycm9yICYmIDEgPT09IGRhdGEud3BtZGJfZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5odG1sKCBkYXRhLmJvZHkgKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS53cG1kYl9kYnJhaW5zX2FwaV9kb3duICYmIDEgPT09IGRhdGEud3BtZGJfZGJyYWluc19hcGlfZG93biApIHtcblx0XHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MudGVtcG9yYXJpbHlfYWN0aXZhdGVkX2xpY2VuY2UgKTtcblx0XHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmFwcGVuZCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5pbnZhbGlkLWxpY2VuY2UnICkuZW1wdHkoKS5odG1sKCB3cG1kYl9zdHJpbmdzLmxpY2VuY2VfcmVhY3RpdmF0ZWQgKTtcblx0XHRcdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0fSApO1xuXG5cdFx0JCggJ2lucHV0W25hbWU9dGFibGVfbWlncmF0ZV9vcHRpb25dJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXliZV9zaG93X21peGVkX2Nhc2VkX3RhYmxlX25hbWVfd2FybmluZygpO1xuXHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl90YWJsZXNfdG9fbWlncmF0ZV9jaGFuZ2VkJyApO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLm9uKCAnY2hhbmdlJywgJyNzZWxlY3QtdGFibGVzJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXliZV9zaG93X21peGVkX2Nhc2VkX3RhYmxlX25hbWVfd2FybmluZygpO1xuXHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl90YWJsZXNfdG9fbWlncmF0ZV9jaGFuZ2VkJyApO1xuXHRcdH0gKTtcblxuXHRcdCQud3BtZGIuYWRkX2ZpbHRlciggJ3dwbWRiX2dldF90YWJsZV9wcmVmaXgnLCBnZXRfdGFibGVfcHJlZml4ICk7XG5cdFx0JC53cG1kYi5hZGRfZmlsdGVyKCAnd3BtZGJfZ2V0X3RhYmxlc190b19taWdyYXRlJywgZ2V0X3RhYmxlc190b19taWdyYXRlICk7XG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfbG9ja19yZXBsYWNlX3VybCcsIGxvY2tfcmVwbGFjZV91cmwgKTtcblxuXHRcdCQud3BtZGIuYWRkX2ZpbHRlciggJ3dwbWRiX2JlZm9yZV9taWdyYXRpb25fY29tcGxldGVfaG9va3MnLCBmdW5jdGlvbiggaG9va3MgKSB7XG5cdFx0XHRwYXVzZV9iZWZvcmVfZmluYWxpemUgPSAkKCAnaW5wdXRbbmFtZT1wYXVzZV9iZWZvcmVfZmluYWxpemVdOmNoZWNrZWQnICkubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0aWYgKCB0cnVlID09PSBwYXVzZV9iZWZvcmVfZmluYWxpemUgJiYgJ3NhdmVmaWxlJyAhPT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0c2V0X3BhdXNlX3Jlc3VtZV9idXR0b24oIG51bGwgKTsgLy8gZG9uJ3QganVzdCBzZXQgbWlncmF0aW9uX3BhdXNlZCB0byB0cnVlLCBzaW5jZSBgc2V0X3BhdXNlX3Jlc3VtZV9idXR0b25gIHdpbGwgZ2V0IGRvdWJsZSBib3VuZCB0byBjbGlja2luZyByZXN1bWVcblx0XHRcdFx0aXNfYXV0b19wYXVzZV9iZWZvcmVfZmluYWxpemUgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGhvb2tzO1xuXHRcdH0gKTtcblxuXHRcdC8qKlxuXHRcdCAqIFNldCBjaGVja2JveFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHN0cmluZyBjaGVja2JveF93cmFwXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gc2V0X2NoZWNrYm94KCBjaGVja2JveF93cmFwICkge1xuXHRcdFx0dmFyICRzd2l0Y2ggPSAkKCAnIycgKyBjaGVja2JveF93cmFwICk7XG5cdFx0XHR2YXIgJGNoZWNrYm94ID0gJHN3aXRjaC5maW5kKCAnaW5wdXRbdHlwZT1jaGVja2JveF0nICk7XG5cblx0XHRcdCRzd2l0Y2gudG9nZ2xlQ2xhc3MoICdvbicgKS5maW5kKCAnc3BhbicgKS50b2dnbGVDbGFzcyggJ2NoZWNrZWQnICk7XG5cdFx0XHR2YXIgc3dpdGNoX29uID0gJHN3aXRjaC5maW5kKCAnc3Bhbi5vbicgKS5oYXNDbGFzcyggJ2NoZWNrZWQnICk7XG5cdFx0XHQkY2hlY2tib3guYXR0ciggJ2NoZWNrZWQnLCBzd2l0Y2hfb24gKS50cmlnZ2VyKCAnY2hhbmdlJyApO1xuXHRcdH1cblxuXHRcdCQoICcud3BtZGItc3dpdGNoJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggISAkKCB0aGlzICkuaGFzQ2xhc3MoICdkaXNhYmxlZCcgKSApIHtcblx0XHRcdFx0c2V0X2NoZWNrYm94KCAkKCB0aGlzICkuYXR0ciggJ2lkJyApICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdH0gKTtcblxufSkoIGpRdWVyeSwgd3BtZGIgKTtcbiJdfQ==
