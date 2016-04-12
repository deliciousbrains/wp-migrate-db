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
		this.migration.$progress.find( '.migration-progress-stages' ).scroll( function() {
			$( this ).find( '.stage-progress' ).css( 'top', $( this ).scrollTop() );
		} );

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

},{"MigrationProgressStage-model":7}],3:[function(require,module,exports){
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
		this.$el.append( newStageSubView.$el );
		this.$el.parent().find( '.stage-tabs' ).append( newStageSubView.$tabElem );
	}
} );

module.exports = MigrationProgressView;

},{"./MigrationProgressStage-view.js":8}],5:[function(require,module,exports){
var MigrationProgressItem = Backbone.Model.extend( {
	defaults: {
		name: '',
		size: 0,
		transferred: 0,
		rows: 0,
		rowsTransferred: 0,
		stageName: '',
		started: false,
		done: false
	},
	getPercentDone: function() {
		return Math.min( 100, Math.ceil( 100 * ( this.get( 'transferred' ) / this.get( 'size' ) ) ) );
	},
	getTransferred: function() {
		return Math.min( this.get( 'size' ), this.get( 'transferred' ) );
	},
	getSizeHR: function() {
		return wpmdb.functions.convertKBSizeToHR( this.get( 'size' ) );
	},
	setComplete: function() {
		this.set( 'transferred', this.get( 'size' ) );
		this.set( 'rowsTransferred', this.get( 'rows' ) );
	},
	setRowsTransferred: function( numRows ) {
		var amtDone, estTransferred;

		if ( -1 === parseInt( numRows ) ) {
			amtDone = 1;
		} else {
			amtDone = Math.min( 1, numRows / this.get( 'rows' ) );
		}

		estTransferred = this.get( 'size' ) * amtDone;

		this.set( 'transferred', estTransferred );
		this.set( 'rowsTransferred', numRows );
	}
} );

module.exports = MigrationProgressItem;

},{}],6:[function(require,module,exports){
var $ = jQuery;

var ItemProgressView = Backbone.View.extend( {
	tagName: 'div',
	className: 'item-progress',
	id: '',
	$progress: null,
	$info: null,
	initialize: function() {
		this.$progress = $( '<div />' ).addClass( 'progress-bar' );
		this.$title = $( '<p>' ).addClass( 'item-info' )
			.append( $( '<span class=name />' ).text( this.model.get( 'name' ) ) )
			.append( ' ' )
			.append( $( '<span class=size />' ).text( '(' + this.model.getSizeHR() + ')' ) );

		this.$el.append( this.$title );
		this.$el.append( this.$progress );

		this.$el.append( '<span class="dashicons dashicons-yes"/>' );

		this.$el.attr( 'id', 'item-' + this.model.get( 'name' ) );
		this.$el.attr( 'data-stage', this.model.get( 'stageName' ) );

		this.model.on( 'change:transferred', this.render, this );
		this.render();
	},
	render: function() {
		var percentDone = Math.max( 0, this.model.getPercentDone() );
		this.$progress.css( 'width', percentDone + '%' );
		if ( 100 <= percentDone ) {
			this.elemComplete();
		}
	},
	elemComplete: function() {
		var self = this;
		this.$el.addClass( 'complete' );
		setTimeout( function() {
			var height = self.$el.height();
			var marginBottom = self.$el.css( 'margin-bottom' );
			var clone = self.$el.clone().css( { height: 0, marginBottom: 0 } ).addClass( 'clone' );
			self.$el.animate( { height: 0, marginBottom: 0 }, 200, 'swing' );
			clone.appendTo( self.$el.parent() );
			clone.animate( { height: height, marginBottom: marginBottom }, 200, 'swing', function() {
				clone.replaceWith( self.$el.css( { height: 'auto', marginBottom: marginBottom } ) );
			} );
		}, 1000 );
	}
} );

module.exports = ItemProgressView;

},{}],7:[function(require,module,exports){
var MigrationProgressItemModel = require( 'MigrationProgressItem-model' );
var $ = jQuery;

var MigrationProgressStage = Backbone.Model.extend( {
	defaults: {
		status: 'queued',
		itemModels: null,
		_initialItems: null,
		items: null,
		totalSize: 0,
		dataType: 'local',
		name: '',
		strings: null
	},
	initialize: function() {
		this.initStrings();

		this.set( '_initialItems', this.get( 'items' ) );
		this.set( 'items', [] );
		this.set( 'itemModels', {} );
		_.each( this.get( '_initialItems' ), function( item ) {
			this.addItem( item.name, item.size, item.rows );
		}, this );

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
		var item = {
			name: name,
			size: size,
			rows: rows || size,
			stageName: this.get( 'name' )
		};

		this.addItemModel( item );
		this.set( 'totalSize', parseInt( this.get( 'totalSize' ) ) + parseInt( size ) );

		this.trigger( 'item:added', this.get( 'itemModels' )[ name ] );
		this.get( 'itemModels' )[ name ].on( 'change', function() {
			this.trigger( 'change' );
		}, this );
	},
	addItemModel: function( item ) {
		var items = this.get( 'items' );
		var itemModels = this.get( 'itemModels' );
		var newItemModel = new MigrationProgressItemModel( item );

		items.push( item );
		itemModels[ item.name ] = newItemModel;
		this.set( 'items', items );
		this.set( 'itemModels', itemModels );
	},
	getItemModel: function( name ) {
		return this.get( 'itemModels' )[ name ];
	},
	setItemComplete: function( name ) {
		var itemModel = this.getItemModel( name );
		itemModel.set( 'transferred', itemModel.get( 'size' ) );
	},
	incrementItemProgress: function( name ) {
		var itemeModel = this.getItemModel( name );
		var transferred = itemeModel.getTransferred();
		var size = itemeModel.get( 'size' );
		var increment = transferred + ( ( size - transferred ) * 0.2 );
		itemeModel.set( 'transferred', increment );
	},
	setItemModelTransferred: function( name, transferred ) {
		this.getItemModel( name ).set( 'transferred', transferred );
	},
	getItemModelTransferred: function( name ) {
		var itemModel = this.getItemModel( name );
		return Math.max( itemModel.get( 'transferred' ), itemModel.get( 'size' ) );
	},
	setItemModelRowsTransferred: function( name, rowsTransferred ) {
		this.getItemModel( name ).setRowsTransferred( rowsTransferred );
	},
	setItemModelComplete: function( name ) {
		this.getItemModel( name ).setComplete();
	},
	recalculateTotalSize: function() {
		var size = 0;
		_.each( this.get( 'itemModels' ), function( itemModel ) {
			size += itemModel.get( 'size' );
		}, this );
		this.set( 'totalSize', size );
		return size;
	},
	getTotalSizeTransferred: function() {
		var transferred = 0;
		_.each( this.get( 'itemModels' ), function( itemModel ) {
			transferred += itemModel.getTransferred();
		}, this );
		return transferred;
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
	}
} );

module.exports = MigrationProgressStage;

},{"MigrationProgressItem-model":5}],8:[function(require,module,exports){
var MigrationProgressItemView = require( './MigrationProgressItem-view.js' );
var $ = jQuery;

var MigrationProgressStageView = Backbone.View.extend( {
	tagName: 'div',
	className: 'migration-progress-stage-container hide-tables',
	$totalProgressElem: null,
	$tabElem: null,
	$showHideTablesElem: null,
	$pauseBeforeFinalizeElem: null,
	$pauseBeforeFinalizeCheckbox: null,
	initialize: function() {
		this.$el.empty();
		this.$el.attr( 'data-stage', this.model.get( 'name' ) ).addClass( 'queued' );

		this.initTotalProgressElem();
		this.$el.prepend( this.$totalProgressElem );

		this.$el.append( '<div class=progress-items />' );

		this.initTabElem();

		this.model.on( 'item:added', function( itemModel ) {
			this.addItemView( itemModel );
		}, this );
		_.each( this.model.get( 'itemModels' ), this.addItemView, this );
		this.model.on( 'change', function() {
			this.updateProgressElem();
		}, this );

		this.model.on( 'change:status', function( e ) {
			this.$el.removeClass( 'queued active' ).addClass( this.model.get( 'status' ) );
			this.$tabElem.removeClass( 'queued active' ).addClass( this.model.get( 'status' ) )
				.find( '.stage-status' ).text( this.model.get( 'strings' )[ this.model.get( 'status' ) ] );
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
		var sizeDone = wpmdb.functions.convertKBSizeToHR( Math.min( this.model.getTotalSizeTransferred(), this.model.get( 'totalSize' ) ) );
		var tablesDone = Math.min( this.$el.find( '.complete' ).length, this.model.get( 'items' ).length );

		if ( 'complete' === this.model.get( 'status' ) && 0 === this.model.get( 'totalSize' ) ) {
			percentDone = 100;
			this.$showHideTablesElem.fadeOut();
		}

		this.$totalProgressElem.find( '.percent-complete' ).text( percentDone );
		this.$totalProgressElem.find( '.size-complete' ).text( sizeDone );
		this.$totalProgressElem.find( '.tables-complete' ).text( tablesDone );
		this.$totalProgressElem.find( '.progress-bar-wrapper .progress-bar' ).css( { width: percentDone + '%' } );
	},
	addItemView: function( itemModel ) {
		var newItemSubView = new MigrationProgressItemView( {
			model: itemModel
		} );
		this.$el.find( '.progress-items' ).append( newItemSubView.$el );
		this.$totalProgressElem.find( '.tables-total' ).text( this.model.get( 'items' ).length );
		this.$totalProgressElem.find( '.size-total' ).text( wpmdb.functions.convertKBSizeToHR( this.model.get( 'totalSize' ) ) );
	}
} );

module.exports = MigrationProgressStageView;

},{"./MigrationProgressItem-view.js":6}],9:[function(require,module,exports){
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
									'<img id="welcome-img" src="' + wpmdb_data.this_plugin_url + 'asset/dist/welcome.jpg" />' +
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
								wpmdb.current_migration.model.getStageModel( stage ).setItemModelRowsTransferred( tables_to_migrate[ i ], row_information.current_row );

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

},{"MigrationProgress-controller":1}]},{},[1,2,3,4,5,6,7,8,9])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvd3AtbWlncmF0ZS1kYi1wcm8vYXNzZXQvc3JjL2pzL21vZHVsZXMvTWlncmF0aW9uUHJvZ3Jlc3MtY29udHJvbGxlci5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy1tb2RlbC5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy11dGlscy5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzcy12aWV3LmpzIiwic3JjL3dwLW1pZ3JhdGUtZGItcHJvL2Fzc2V0L3NyYy9qcy9tb2R1bGVzL01pZ3JhdGlvblByb2dyZXNzSXRlbS1tb2RlbC5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzc0l0ZW0tdmlldy5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvbW9kdWxlcy9NaWdyYXRpb25Qcm9ncmVzc1N0YWdlLW1vZGVsLmpzIiwic3JjL3dwLW1pZ3JhdGUtZGItcHJvL2Fzc2V0L3NyYy9qcy9tb2R1bGVzL01pZ3JhdGlvblByb2dyZXNzU3RhZ2Utdmlldy5qcyIsInNyYy93cC1taWdyYXRlLWRiLXByby9hc3NldC9zcmMvanMvc2NyaXB0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNU1BO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNwSUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyICQgPSBqUXVlcnk7XG52YXIgTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbCA9IHJlcXVpcmUoICdNaWdyYXRpb25Qcm9ncmVzcy1tb2RlbCcgKTtcbnZhciBNaWdyYXRpb25Qcm9ncmVzc1ZpZXcgPSByZXF1aXJlKCAnTWlncmF0aW9uUHJvZ3Jlc3MtdmlldycgKTtcbnZhciAkb3ZlcmxheU9yaWdpbmFsID0gJCggJzxkaXYgaWQ9XCJvdmVybGF5XCIgY2xhc3M9XCJoaWRlXCI+PC9kaXY+JyApO1xudmFyICRwcm9ncmVzc0NvbnRlbnRPcmlnaW5hbCA9ICQoICcucHJvZ3Jlc3MtY29udGVudCcgKS5jbG9uZSgpLmFkZENsYXNzKCAnaGlkZScgKTtcbnZhciAkcHJvVmVyc2lvbiA9ICQoICcucHJvLXZlcnNpb24nICkuYWRkQ2xhc3MoICdoaWRlJyApO1xuXG4kb3ZlcmxheU9yaWdpbmFsLmFwcGVuZCggJHByb1ZlcnNpb24gKTtcblxudmFyIE1pZ3JhdGlvblByb2dyZXNzQ29udHJvbGxlciA9IHtcblx0bWlncmF0aW9uOiB7XG5cdFx0bW9kZWw6IHt9LFxuXHRcdHZpZXc6IHt9LFxuXHRcdCRwcm9ncmVzczoge30sXG5cdFx0JHdyYXBwZXI6IHt9LFxuXHRcdCRvdmVybGF5OiB7fSxcblx0XHRzdGF0dXM6ICdhY3RpdmUnLFxuXHRcdHRpdGxlOiAnJyxcblx0XHR0ZXh0OiAnJyxcblx0XHR0aW1lckNvdW50OiAwLFxuXHRcdGVsYXBzZWRJbnRlcnZhbDogMCxcblx0XHRjdXJyZW50U3RhZ2VOdW06IDAsXG5cdFx0Y291bnRlckRpc3BsYXk6IGZhbHNlLFxuXHRcdG9yaWdpbmFsVGl0bGU6IGRvY3VtZW50LnRpdGxlLFxuXHRcdHNldFRpdGxlOiBmdW5jdGlvbiggdGl0bGUgKSB7XG5cdFx0XHR0aGlzLiRwcm9ncmVzcy5maW5kKCAnLnByb2dyZXNzLXRpdGxlJyApLmh0bWwoIHRpdGxlICk7XG5cdFx0XHR0aGlzLnRpdGxlID0gdGl0bGU7XG5cdFx0fSxcblx0XHRzZXRTdGF0dXM6IGZ1bmN0aW9uKCBzdGF0dXMgKSB7XG5cdFx0XHR0aGlzLiRwcm9ncmVzc1xuXHRcdFx0XHQucmVtb3ZlQ2xhc3MoIHRoaXMuc3RhdHVzIClcblx0XHRcdFx0LmFkZENsYXNzKCAoICdlcnJvcicgPT09IHN0YXR1cyApID8gJ3dwbWRiLWVycm9yJyA6IHN0YXR1cyApO1xuXG5cdFx0XHQvLyBQb3NzaWJsZSBzdGF0dXNlcyBpbmNsdWRlOiAnZXJyb3InLCAncGF1c2VkJywgJ2NvbXBsZXRlJywgJ2NhbmNlbGxpbmcnXG5cdFx0XHRpZiAoICdlcnJvcicgPT09IHN0YXR1cyApIHtcblx0XHRcdFx0dGhpcy4kcHJvZ3Jlc3MuZmluZCggJy5wcm9ncmVzcy10ZXh0JyApLmFkZENsYXNzKCAnbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLnN0YXR1cyA9IHN0YXR1cztcblxuXHRcdFx0dGhpcy51cGRhdGVUaXRsZUVsZW0oKTtcblx0XHR9LFxuXHRcdHNldFRleHQ6IGZ1bmN0aW9uKCB0ZXh0ICkge1xuXHRcdFx0aWYgKCAnc3RyaW5nJyAhPT0gdHlwZW9mIHRleHQgKSB7XG5cdFx0XHRcdHRleHQgPSAnJztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAwID49IHRleHQuaW5kZXhPZiggJ3dwbWRiX2Vycm9yJyApICkge1xuXHRcdFx0XHR0ZXh0ID0gdGhpcy5kZWNvZGVFcnJvck9iamVjdCggdGV4dCApO1xuXHRcdFx0fVxuXG5cdFx0XHR0aGlzLiRwcm9ncmVzcy5maW5kKCAnLnByb2dyZXNzLXRleHQnICkuaHRtbCggdGV4dCApO1xuXHRcdFx0dGhpcy50ZXh0ID0gdGV4dDtcblx0XHR9LFxuXHRcdHNldFN0YXRlOiBmdW5jdGlvbiggdGl0bGUsIHRleHQsIHN0YXR1cyApIHtcblx0XHRcdGlmICggbnVsbCAhPT0gdGl0bGUgKSB7XG5cdFx0XHRcdHRoaXMuc2V0VGl0bGUoIHRpdGxlICk7XG5cdFx0XHR9XG5cdFx0XHRpZiAoIG51bGwgIT09IHRleHQgKSB7XG5cdFx0XHRcdHRoaXMuc2V0VGV4dCggdGV4dCApO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCBudWxsICE9PSBzdGF0dXMgKSB7XG5cdFx0XHRcdHRoaXMuc2V0U3RhdHVzKCBzdGF0dXMgKTtcblx0XHRcdH1cblx0XHR9LFxuXHRcdHN0YXJ0VGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy50aW1lckNvdW50ID0gMDtcblx0XHRcdHRoaXMuY291bnRlckRpc3BsYXkgPSAkKCAnLnRpbWVyJyApO1xuXHRcdFx0dGhpcy5lbGFwc2VkSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggdGhpcy5pbmNyZW1lbnRUaW1lciwgMTAwMCApO1xuXHRcdH0sXG5cdFx0cGF1c2VUaW1lcjogZnVuY3Rpb24oKSB7XG5cdFx0XHRjbGVhckludGVydmFsKCB0aGlzLmVsYXBzZWRJbnRlcnZhbCApO1xuXHRcdH0sXG5cdFx0cmVzdW1lVGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy5lbGFwc2VkSW50ZXJ2YWwgPSBzZXRJbnRlcnZhbCggdGhpcy5pbmNyZW1lbnRUaW1lciwgMTAwMCApO1xuXHRcdH0sXG5cdFx0aW5jcmVtZW50VGltZXI6IGZ1bmN0aW9uKCkge1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24udGltZXJDb3VudCA9IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnRpbWVyQ291bnQgKyAxO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uZGlzcGxheUNvdW50KCk7XG5cdFx0fSxcblx0XHRkaXNwbGF5Q291bnQ6IGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhvdXJzID0gTWF0aC5mbG9vciggdGhpcy50aW1lckNvdW50IC8gMzYwMCApICUgMjQ7XG5cdFx0XHR2YXIgbWludXRlcyA9IE1hdGguZmxvb3IoIHRoaXMudGltZXJDb3VudCAvIDYwICkgJSA2MDtcblx0XHRcdHZhciBzZWNvbmRzID0gdGhpcy50aW1lckNvdW50ICUgNjA7XG5cdFx0XHR2YXIgZGlzcGxheSA9IHRoaXMucGFkKCBob3VycywgMiwgMCApICsgJzonICsgdGhpcy5wYWQoIG1pbnV0ZXMsIDIsIDAgKSArICc6JyArIHRoaXMucGFkKCBzZWNvbmRzLCAyLCAwICk7XG5cdFx0XHR0aGlzLmNvdW50ZXJEaXNwbGF5Lmh0bWwoIGRpc3BsYXkgKTtcblx0XHR9LFxuXHRcdHVwZGF0ZVRpdGxlRWxlbTogZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgYWN0aXZlU3RhZ2UgPSB0aGlzLm1vZGVsLmdldCggJ2FjdGl2ZVN0YWdlTmFtZScgKTtcblx0XHRcdHZhciBzdGFnZU1vZGVsID0gdGhpcy5tb2RlbC5nZXRTdGFnZU1vZGVsKCBhY3RpdmVTdGFnZSApO1xuXHRcdFx0dmFyIHBlcmNlbnREb25lID0gTWF0aC5tYXgoIDAsIHN0YWdlTW9kZWwuZ2V0VG90YWxQcm9ncmVzc1BlcmNlbnQoKSApO1xuXHRcdFx0dmFyIG51bVN0YWdlcyA9IHRoaXMubW9kZWwuZ2V0KCAnc3RhZ2VzJyApLmxlbmd0aDtcblx0XHRcdHZhciBjdXJyZW50U3RhZ2UgPSB0aGlzLmN1cnJlbnRTdGFnZU51bTtcblx0XHRcdHZhciBjdXJyZW50U3RhdHVzID0gdGhpcy5zdGF0dXM7XG5cdFx0XHR2YXIgcHJvZ3Jlc3NUZXh0ID0gd3BtZGJfc3RyaW5ncy50aXRsZV9wcm9ncmVzcztcblxuXHRcdFx0aWYgKCAnY29tcGxldGUnID09PSBzdGFnZU1vZGVsLmdldCggJ3N0YXR1cycgKSAmJiAwID09PSBzdGFnZU1vZGVsLmdldCggJ3RvdGFsU2l6ZScgKSApIHtcblx0XHRcdFx0cGVyY2VudERvbmUgPSAxMDA7XG5cdFx0XHR9XG5cblx0XHRcdHByb2dyZXNzVGV4dCA9IHByb2dyZXNzVGV4dC5yZXBsYWNlKCAnJTEkcycsIHBlcmNlbnREb25lICsgJyUnICk7XG5cdFx0XHRwcm9ncmVzc1RleHQgPSBwcm9ncmVzc1RleHQucmVwbGFjZSggJyUyJHMnLCBjdXJyZW50U3RhZ2UgKTtcblx0XHRcdHByb2dyZXNzVGV4dCA9IHByb2dyZXNzVGV4dC5yZXBsYWNlKCAnJTMkcycsIG51bVN0YWdlcyApO1xuXG5cdFx0XHRpZiAoIDEgPT09IG51bVN0YWdlcyApIHtcblx0XHRcdFx0cHJvZ3Jlc3NUZXh0ID0gcGVyY2VudERvbmUgKyAnJSc7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggd3BtZGJfc3RyaW5nc1sgJ3RpdGxlXycgKyBjdXJyZW50U3RhdHVzIF0gKSB7XG5cdFx0XHRcdHByb2dyZXNzVGV4dCA9IHdwbWRiX3N0cmluZ3NbICd0aXRsZV8nICsgY3VycmVudFN0YXR1cyBdO1xuXHRcdFx0fVxuXG5cdFx0XHRwcm9ncmVzc1RleHQgPSBwcm9ncmVzc1RleHQgKyAnIC0gJyArIHRoaXMub3JpZ2luYWxUaXRsZTtcblxuXHRcdFx0ZG9jdW1lbnQudGl0bGUgPSBwcm9ncmVzc1RleHQ7XG5cdFx0fSxcblx0XHRyZXN0b3JlVGl0bGVFbGVtOiBmdW5jdGlvbigpIHtcblx0XHRcdGRvY3VtZW50LnRpdGxlID0gdGhpcy5vcmlnaW5hbFRpdGxlO1xuXHRcdH0sXG5cdFx0cGFkOiBmdW5jdGlvbiggbnVtLCB3aWR0aCwgcGFkQ2hhciApIHtcblx0XHRcdHBhZENoYXIgPSBwYWRDaGFyIHx8ICcwJztcblx0XHRcdG51bSA9IG51bSArICcnO1xuXHRcdFx0cmV0dXJuIG51bS5sZW5ndGggPj0gd2lkdGggPyBudW0gOiBuZXcgQXJyYXkoIHdpZHRoIC0gbnVtLmxlbmd0aCArIDEgKS5qb2luKCBwYWRDaGFyICkgKyBudW07XG5cdFx0fSxcblxuXHRcdC8vIGZpeGVzIGVycm9yIG9iamVjdHMgdGhhdCBoYXZlIGJlZW4gbWFuZ2xlZCBieSBodG1sIGVuY29kaW5nXG5cdFx0ZGVjb2RlRXJyb3JPYmplY3Q6IGZ1bmN0aW9uKCBpbnB1dCApIHtcblx0XHRcdHZhciBpbnB1dERlY29kZWQgPSBpbnB1dFxuXHRcdFx0XHQucmVwbGFjZSggL1xceyZxdW90Oy9nLCAneyNxISMnIClcblx0XHRcdFx0LnJlcGxhY2UoIC9cXCZxdW90O30vZywgJyNxISN9JyApXG5cdFx0XHRcdC5yZXBsYWNlKCAvLCZxdW90Oy9nLCAnLCNxISMnIClcblx0XHRcdFx0LnJlcGxhY2UoIC8mcXVvdDs6L2csICcjcSEjOicgKVxuXHRcdFx0XHQucmVwbGFjZSggLzomcXVvdDsvZywgJzojcSEjJyApXG5cdFx0XHRcdC5yZXBsYWNlKCAvJnF1b3Q7L2csICdcXFxcXCInIClcblx0XHRcdFx0LnJlcGxhY2UoIC8jcSEjL2csICdcIicgKVxuXHRcdFx0XHQucmVwbGFjZSggLyZndDsvZywgJz4nIClcblx0XHRcdFx0LnJlcGxhY2UoIC8mbHQ7L2csICc8JyApO1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0aW5wdXREZWNvZGVkID0gSlNPTi5wYXJzZSggaW5wdXREZWNvZGVkICk7XG5cdFx0XHR9IGNhdGNoICggZSApIHtcblx0XHRcdFx0cmV0dXJuIGlucHV0O1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuICggJ29iamVjdCcgPT09IHR5cGVvZiBpbnB1dERlY29kZWQgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBpbnB1dERlY29kZWQuYm9keSApID8gaW5wdXREZWNvZGVkIDogaW5wdXQ7XG5cdFx0fVxuXHR9LFxuXHRuZXdNaWdyYXRpb246IGZ1bmN0aW9uKCBzZXR0aW5ncyApIHtcblx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlKCk7XG5cdFx0JCggJy5wcm9ncmVzcy1jb250ZW50JyApLnJlbW92ZSgpO1xuXHRcdHRoaXMubWlncmF0aW9uLiRvdmVybGF5ID0gJG92ZXJsYXlPcmlnaW5hbC5jbG9uZSgpO1xuXG5cdFx0JCggJyN3cHdyYXAnICkuYXBwZW5kKCB0aGlzLm1pZ3JhdGlvbi4kb3ZlcmxheSApO1xuXG5cdFx0dGhpcy5taWdyYXRpb24ubW9kZWwgPSBuZXcgTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbCggc2V0dGluZ3MgKTtcblx0XHR0aGlzLm1pZ3JhdGlvbi52aWV3ID0gbmV3IE1pZ3JhdGlvblByb2dyZXNzVmlldygge1xuXHRcdFx0bW9kZWw6IHRoaXMubWlncmF0aW9uLm1vZGVsXG5cdFx0fSApO1xuXG5cdFx0dGhpcy5taWdyYXRpb24uJHByb2dyZXNzID0gJHByb2dyZXNzQ29udGVudE9yaWdpbmFsLmNsb25lKCk7XG5cdFx0dGhpcy5taWdyYXRpb24uJHdyYXBwZXIgPSB0aGlzLm1pZ3JhdGlvbi4kcHJvZ3Jlc3MuZmluZCggJy5taWdyYXRpb24tcHJvZ3Jlc3Mtc3RhZ2VzJyApO1xuXHRcdHRoaXMubWlncmF0aW9uLiRwcm9WZXJzaW9uID0gdGhpcy5taWdyYXRpb24uJG92ZXJsYXkuZmluZCggJy5wcm8tdmVyc2lvbicgKTtcblxuXHRcdHZhciBwcm9WZXJzaW9uSUZyYW1lID0gdGhpcy5taWdyYXRpb24uJHByb1ZlcnNpb24uZmluZCggJ2lmcmFtZScgKS5yZW1vdmUoKS5jbG9uZSgpO1xuXG5cdFx0dGhpcy5taWdyYXRpb24uJHdyYXBwZXIucmVwbGFjZVdpdGgoIHRoaXMubWlncmF0aW9uLnZpZXcuJGVsICk7XG5cdFx0dGhpcy5taWdyYXRpb24uJG92ZXJsYXkucHJlcGVuZCggdGhpcy5taWdyYXRpb24uJHByb2dyZXNzICk7XG5cblx0XHQvLyB0aW1lb3V0IG5lZWRlZCBzbyBjbGFzcyBpcyBhZGRlZCBhZnRlciBlbGVtZW50cyBhcmUgYXBwZW5kZWQgdG8gZG9tIGFuZCB0cmFuc2l0aW9uIHJ1bnMuXG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5taWdyYXRpb24uJG92ZXJsYXkuYWRkKCBzZWxmLm1pZ3JhdGlvbi4kcHJvZ3Jlc3MgKS5hZGQoIHNlbGYubWlncmF0aW9uLiRwcm9WZXJzaW9uICkucmVtb3ZlQ2xhc3MoICdoaWRlJyApLmFkZENsYXNzKCAnc2hvdycgKTtcblx0XHRcdGlmICggc2VsZi5taWdyYXRpb24uJHByb1ZlcnNpb24ubGVuZ3RoICkge1xuXHRcdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRzZWxmLm1pZ3JhdGlvbi4kcHJvVmVyc2lvbi5maW5kKCAnLmlmcmFtZScgKS5hcHBlbmQoIHByb1ZlcnNpb25JRnJhbWUgKTtcblx0XHRcdFx0fSwgNTAwICk7XG5cdFx0XHR9XG5cdFx0fSwgMCApO1xuXG5cdFx0Ly8gU3RpY2sgc3RhZ2UgcHJvZ3Jlc3MgdG8gdG9wIG9mIGNvbnRhaW5lclxuXHRcdHRoaXMubWlncmF0aW9uLiRwcm9ncmVzcy5maW5kKCAnLm1pZ3JhdGlvbi1wcm9ncmVzcy1zdGFnZXMnICkuc2Nyb2xsKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoIHRoaXMgKS5maW5kKCAnLnN0YWdlLXByb2dyZXNzJyApLmNzcyggJ3RvcCcsICQoIHRoaXMgKS5zY3JvbGxUb3AoKSApO1xuXHRcdH0gKTtcblxuXHRcdHRoaXMubWlncmF0aW9uLmN1cnJlbnRTdGFnZU51bSA9IDA7XG5cblx0XHR0aGlzLm1pZ3JhdGlvbi4kcHJvVmVyc2lvbi5vbiggJ2NsaWNrJywgJy5jbG9zZS1wcm8tdmVyc2lvbicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0c2VsZi5taWdyYXRpb24uJHByb1ZlcnNpb24uZmluZCggJ2lmcmFtZScgKS5yZW1vdmUoKTtcblx0XHRcdHNlbGYubWlncmF0aW9uLiRwcm9WZXJzaW9uLmFkZENsYXNzKCAnaGlkZSByZW1vdmUnICk7XG5cdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0c2VsZi5taWdyYXRpb24uJHByb1ZlcnNpb24ucmVtb3ZlKCk7XG5cdFx0XHR9LCA1MDAgKTtcblx0XHR9ICk7XG5cblx0XHR0aGlzLm1pZ3JhdGlvbi5tb2RlbC5vbiggJ21pZ3JhdGlvbkNvbXBsZXRlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRzZWxmLnV0aWxzLnVwZGF0ZVByb2dUYWJsZVZpc2liaWxpdHlTZXR0aW5nKCk7XG5cdFx0XHRzZWxmLnV0aWxzLnVwZGF0ZVBhdXNlQmVmb3JlRmluYWxpemVTZXR0aW5nKCk7XG5cdFx0XHRzZWxmLm1pZ3JhdGlvbi5wYXVzZVRpbWVyKCk7XG5cdFx0fSApO1xuXG5cdFx0cmV0dXJuIHRoaXMubWlncmF0aW9uO1xuXHR9LFxuXHR1dGlsczogcmVxdWlyZSggJ01pZ3JhdGlvblByb2dyZXNzLXV0aWxzJyApXG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZ3JhdGlvblByb2dyZXNzQ29udHJvbGxlcjtcbiIsInZhciBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlTW9kZWwgPSByZXF1aXJlKCAnTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZS1tb2RlbCcgKTtcbnZhciAkID0galF1ZXJ5O1xuXG52YXIgTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbCA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCgge1xuXHRkZWZhdWx0czoge1xuXHRcdF9pbml0aWFsU3RhZ2VzOiBudWxsLFxuXHRcdHN0YWdlczogbnVsbCxcblx0XHRhY3RpdmVTdGFnZU5hbWU6IG51bGwsXG5cdFx0c3RhZ2VNb2RlbHM6IG51bGwsXG5cdFx0bG9jYWxUYWJsZVJvd3M6IG51bGwsXG5cdFx0bG9jYWxUYWJsZVNpemVzOiBudWxsLFxuXHRcdHJlbW90ZVRhYmxlUm93czogbnVsbCxcblx0XHRyZW1vdGVUYWJsZVNpemVzOiBudWxsLFxuXHRcdG1pZ3JhdGlvblN0YXR1czogJ2FjdGl2ZScsXG5cdFx0bWlncmF0aW9uSW50ZW50OiAnc2F2ZWZpbGUnXG5cdH0sXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2V0KCAnc3RhZ2VNb2RlbHMnLCB7fSApO1xuXHRcdHRoaXMuc2V0KCAnX2luaXRpYWxTdGFnZXMnLCB0aGlzLmdldCggJ3N0YWdlcycgKSApO1xuXHRcdHRoaXMuc2V0KCAnc3RhZ2VzJywgW10gKTtcblx0XHRfLmVhY2goIHRoaXMuZ2V0KCAnX2luaXRpYWxTdGFnZXMnICksIGZ1bmN0aW9uKCBzdGFnZSwgaXRlbXMsIGRhdGFUeXBlICkge1xuXHRcdFx0dGhpcy5hZGRTdGFnZSggc3RhZ2UubmFtZSwgaXRlbXMsIGRhdGFUeXBlICk7XG5cdFx0fSwgdGhpcyApO1xuXHR9LFxuXHRhZGRTdGFnZTogZnVuY3Rpb24oIG5hbWUsIGl0ZW1zLCBkYXRhVHlwZSwgZXh0ZW5kICkge1xuXHRcdHZhciBpdGVtc0FyciA9IFtdO1xuXHRcdHZhciBzdGFnZTtcblxuXHRcdF8uZWFjaCggaXRlbXMsIGZ1bmN0aW9uKCBpdGVtICkge1xuXHRcdFx0dmFyIHNpemUsIHJvd3M7XG5cblx0XHRcdGlmICggJ3JlbW90ZScgPT09IGRhdGFUeXBlICkge1xuXHRcdFx0XHRzaXplID0gdGhpcy5nZXQoICdyZW1vdGVUYWJsZVNpemVzJyApWyBpdGVtIF07XG5cdFx0XHRcdHJvd3MgPSB0aGlzLmdldCggJ3JlbW90ZVRhYmxlUm93cycgKVsgaXRlbSBdO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c2l6ZSA9IHRoaXMuZ2V0KCAnbG9jYWxUYWJsZVNpemVzJyApWyBpdGVtIF07XG5cdFx0XHRcdHJvd3MgPSB0aGlzLmdldCggJ2xvY2FsVGFibGVSb3dzJyApWyBpdGVtIF07XG5cdFx0XHR9XG5cblx0XHRcdGl0ZW1zQXJyLnB1c2goIHtcblx0XHRcdFx0bmFtZTogaXRlbSxcblx0XHRcdFx0c2l6ZTogc2l6ZSxcblx0XHRcdFx0cm93czogcm93c1xuXHRcdFx0fSApO1xuXHRcdH0sIHRoaXMgKTtcblxuXHRcdHN0YWdlID0ge1xuXHRcdFx0bmFtZTogbmFtZSxcblx0XHRcdGl0ZW1zOiBpdGVtc0Fycixcblx0XHRcdGRhdGFUeXBlOiBkYXRhVHlwZVxuXHRcdH07XG5cblx0XHRpZiAoICdvYmplY3QnID09PSB0eXBlb2YgZXh0ZW5kICkge1xuXHRcdFx0c3RhZ2UgPSAkLmV4dGVuZCggc3RhZ2UsIGV4dGVuZCApO1xuXHRcdH1cblxuXHRcdHRoaXMuYWRkU3RhZ2VNb2RlbCggc3RhZ2UgKTtcblxuXHRcdHRoaXMudHJpZ2dlciggJ3N0YWdlOmFkZGVkJywgdGhpcy5nZXQoICdzdGFnZU1vZGVscycgKVsgbmFtZSBdICk7XG5cdFx0dGhpcy5nZXQoICdzdGFnZU1vZGVscycgKVsgbmFtZSBdLm9uKCAnY2hhbmdlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR0aGlzLnRyaWdnZXIoICdjaGFuZ2UnICk7XG5cdFx0fSwgdGhpcyApO1xuXG5cdFx0cmV0dXJuIHRoaXMuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UubmFtZSApO1xuXHR9LFxuXHRhZGRTdGFnZUl0ZW06IGZ1bmN0aW9uKCBzdGFnZSwgbmFtZSwgc2l6ZSwgcm93cyApIHtcblx0XHR0aGlzLmdldFN0YWdlTW9kZWwoIHN0YWdlICkuYWRkSXRlbSggbmFtZSwgc2l6ZSwgcm93cyApO1xuXHR9LFxuXHRhZGRTdGFnZU1vZGVsOiBmdW5jdGlvbiggc3RhZ2UgKSB7XG5cdFx0dmFyIHN0YWdlcyA9IHRoaXMuZ2V0KCAnc3RhZ2VzJyApO1xuXHRcdHZhciBzdGFnZU1vZGVscyA9IHRoaXMuZ2V0KCAnc3RhZ2VNb2RlbHMnICk7XG5cdFx0dmFyIG5ld1N0YWdlTW9kZWwgPSBuZXcgTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZU1vZGVsKCBzdGFnZSApO1xuXG5cdFx0c3RhZ2VzLnB1c2goIHN0YWdlICk7XG5cdFx0c3RhZ2VNb2RlbHNbIHN0YWdlLm5hbWUgXSA9IG5ld1N0YWdlTW9kZWw7XG5cblx0XHR0aGlzLnNldCggJ3N0YWdlcycsIHN0YWdlcyApO1xuXHRcdHRoaXMuc2V0KCAnc3RhZ2VNb2RlbHMnLCBzdGFnZU1vZGVscyApO1xuXHR9LFxuXHRnZXRTdGFnZU1vZGVsOiBmdW5jdGlvbiggbmFtZSApIHtcblx0XHRyZXR1cm4gdGhpcy5nZXQoICdzdGFnZU1vZGVscycgKVsgbmFtZSBdO1xuXHR9LFxuXHRnZXRTdGFnZUl0ZW1zOiBmdW5jdGlvbiggc3RhZ2UsIG1hcCApIHtcblx0XHR2YXIgc3RhZ2VNb2RlbCA9IHRoaXMuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UgKTtcblx0XHR2YXIgaXRlbXMgPSBzdGFnZU1vZGVsLmdldCggJ2l0ZW1zJyApO1xuXG5cdFx0aWYgKCB1bmRlZmluZWQgPT09IG1hcCApIHtcblx0XHRcdHJldHVybiBpdGVtcztcblx0XHR9IGVsc2Uge1xuXHRcdFx0cmV0dXJuIGl0ZW1zLm1hcCggZnVuY3Rpb24oIGl0ZW0gKSB7XG5cdFx0XHRcdHJldHVybiBpdGVtWyBtYXAgXTtcblx0XHRcdH0gKTtcblx0XHR9XG5cdH0sXG5cdHNldEFjdGl2ZVN0YWdlOiBmdW5jdGlvbiggc3RhZ2UgKSB7XG5cdFx0dGhpcy5zZXRTdGFnZUNvbXBsZXRlKCk7XG5cdFx0dGhpcy5zZXQoICdhY3RpdmVTdGFnZU5hbWUnLCBzdGFnZSApO1xuXHRcdHRoaXMuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UgKS5zZXQoICdzdGF0dXMnLCAnYWN0aXZlJyApO1xuXHRcdHRoaXMudHJpZ2dlciggJ2NoYW5nZTphY3RpdmVTdGFnZScgKTtcblx0fSxcblx0c2V0U3RhZ2VDb21wbGV0ZTogZnVuY3Rpb24oIHN0YWdlICkge1xuXHRcdGlmICggISBzdGFnZSApIHtcblx0XHRcdHN0YWdlID0gdGhpcy5nZXQoICdhY3RpdmVTdGFnZU5hbWUnICk7XG5cdFx0fVxuXHRcdGlmICggbnVsbCAhPT0gc3RhZ2UgKSB7XG5cdFx0XHR0aGlzLmdldFN0YWdlTW9kZWwoIHN0YWdlICkuc2V0KCAnc3RhdHVzJywgJ2NvbXBsZXRlJyApO1xuXHRcdH1cblxuXHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLmN1cnJlbnRTdGFnZU51bSA9IHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLmN1cnJlbnRTdGFnZU51bSArIDE7XG5cdH0sXG5cdHNldE1pZ3JhdGlvbkNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgbGFzdFN0YWdlID0gdGhpcy5nZXRTdGFnZU1vZGVsKCB0aGlzLmdldCggJ2FjdGl2ZVN0YWdlTmFtZScgKSApO1xuXHRcdHRoaXMuc2V0U3RhZ2VDb21wbGV0ZSgpO1xuXHRcdHRoaXMudHJpZ2dlciggJ21pZ3JhdGlvbkNvbXBsZXRlJyApO1xuXHRcdHRoaXMuc2V0KCAnbWlncmF0aW9uU3RhdHVzJywgJ2NvbXBsZXRlJyApO1xuXHRcdGxhc3RTdGFnZS5hY3RpdmF0ZVRhYigpO1xuXHR9XG59ICk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWlncmF0aW9uUHJvZ3Jlc3NNb2RlbDtcbiIsInZhciAkID0galF1ZXJ5O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcblx0dXBkYXRlUHJvZ1RhYmxlVmlzaWJpbGl0eVNldHRpbmc6IGZ1bmN0aW9uKCkge1xuXHRcdGlmICggISB3cG1kYl9kYXRhLnByb2dfdGFibGVzX3Zpc2liaWxpdHlfY2hhbmdlZCApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cdFx0d3BtZGJfZGF0YS5wcm9nX3RhYmxlc192aXNpYmlsaXR5X2NoYW5nZWQgPSBmYWxzZTtcblxuXHRcdCQuYWpheCgge1xuXHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfc2F2ZV9zZXR0aW5nJyxcblx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnNhdmVfc2V0dGluZyxcblx0XHRcdFx0c2V0dGluZzogJ3Byb2dfdGFibGVzX2hpZGRlbicsXG5cdFx0XHRcdGNoZWNrZWQ6IEJvb2xlYW4oIHdwbWRiX2RhdGEucHJvZ190YWJsZXNfaGlkZGVuIClcblx0XHRcdH0sXG5cdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coICdDb3VsZCBub3Qgc2F2ZSBwcm9ncmVzcyBpdGVtIHZpc2liaWxpdHkgc2V0dGluZycsIGVycm9yVGhyb3duICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHR9LFxuXHR1cGRhdGVQYXVzZUJlZm9yZUZpbmFsaXplU2V0dGluZzogZnVuY3Rpb24oKSB7XG5cdFx0aWYgKCAhIHdwbWRiX2RhdGEucGF1c2VfYmVmb3JlX2ZpbmFsaXplX2NoYW5nZWQgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHdwbWRiX2RhdGEucGF1c2VfYmVmb3JlX2ZpbmFsaXplX2NoYW5nZWQgPSBmYWxzZTtcblxuXHRcdCQuYWpheCgge1xuXHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdGRhdGE6IHtcblx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfc2F2ZV9zZXR0aW5nJyxcblx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnNhdmVfc2V0dGluZyxcblx0XHRcdFx0c2V0dGluZzogJ3BhdXNlX2JlZm9yZV9maW5hbGl6ZScsXG5cdFx0XHRcdGNoZWNrZWQ6IEJvb2xlYW4oIHdwbWRiX2RhdGEucGF1c2VfYmVmb3JlX2ZpbmFsaXplIClcblx0XHRcdH0sXG5cdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0Y29uc29sZS5sb2coICdDb3VsZCBub3Qgc2F2ZSBwYXVzZSBiZWZvcmUgZmluYWxpemUgc2V0dGluZycsIGVycm9yVGhyb3duICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHR9XG59O1xuIiwidmFyIE1pZ3JhdGlvblByb2dyZXNzU3RhZ2VWaWV3ID0gcmVxdWlyZSggJy4vTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZS12aWV3LmpzJyApO1xudmFyICQgPSBqUXVlcnk7XG5cbnZhciBNaWdyYXRpb25Qcm9ncmVzc1ZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCgge1xuXHR0YWdOYW1lOiAnZGl2Jyxcblx0Y2xhc3NOYW1lOiAnbWlncmF0aW9uLXByb2dyZXNzLXN0YWdlcycsXG5cdGlkOiAnbWlncmF0aW9uLXByb2dyZXNzLXN0YWdlcycsXG5cdHNlbGY6IHRoaXMsXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuJGVsLmVtcHR5KCk7XG5cblx0XHR0aGlzLm1vZGVsLm9uKCAnc3RhZ2U6YWRkZWQnLCBmdW5jdGlvbiggc3RhZ2VNb2RlbCApIHtcblx0XHRcdHRoaXMuYWRkU3RhZ2VWaWV3KCBzdGFnZU1vZGVsICk7XG5cdFx0fSwgdGhpcyApO1xuXG5cdFx0Xy5lYWNoKCB0aGlzLm1vZGVsLmdldCggJ3N0YWdlTW9kZWxzJyApLCB0aGlzLmFkZFN0YWdlVmlldywgdGhpcyApO1xuXHR9LFxuXHRhZGRTdGFnZVZpZXc6IGZ1bmN0aW9uKCBzdGFnZU1vZGVsICkge1xuXHRcdHZhciBuZXdTdGFnZVN1YlZpZXcgPSBuZXcgTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZVZpZXcoIHtcblx0XHRcdG1vZGVsOiBzdGFnZU1vZGVsXG5cdFx0fSApO1xuXHRcdHRoaXMuJGVsLmFwcGVuZCggbmV3U3RhZ2VTdWJWaWV3LiRlbCApO1xuXHRcdHRoaXMuJGVsLnBhcmVudCgpLmZpbmQoICcuc3RhZ2UtdGFicycgKS5hcHBlbmQoIG5ld1N0YWdlU3ViVmlldy4kdGFiRWxlbSApO1xuXHR9XG59ICk7XG5cbm1vZHVsZS5leHBvcnRzID0gTWlncmF0aW9uUHJvZ3Jlc3NWaWV3O1xuIiwidmFyIE1pZ3JhdGlvblByb2dyZXNzSXRlbSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCgge1xuXHRkZWZhdWx0czoge1xuXHRcdG5hbWU6ICcnLFxuXHRcdHNpemU6IDAsXG5cdFx0dHJhbnNmZXJyZWQ6IDAsXG5cdFx0cm93czogMCxcblx0XHRyb3dzVHJhbnNmZXJyZWQ6IDAsXG5cdFx0c3RhZ2VOYW1lOiAnJyxcblx0XHRzdGFydGVkOiBmYWxzZSxcblx0XHRkb25lOiBmYWxzZVxuXHR9LFxuXHRnZXRQZXJjZW50RG9uZTogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1hdGgubWluKCAxMDAsIE1hdGguY2VpbCggMTAwICogKCB0aGlzLmdldCggJ3RyYW5zZmVycmVkJyApIC8gdGhpcy5nZXQoICdzaXplJyApICkgKSApO1xuXHR9LFxuXHRnZXRUcmFuc2ZlcnJlZDogZnVuY3Rpb24oKSB7XG5cdFx0cmV0dXJuIE1hdGgubWluKCB0aGlzLmdldCggJ3NpemUnICksIHRoaXMuZ2V0KCAndHJhbnNmZXJyZWQnICkgKTtcblx0fSxcblx0Z2V0U2l6ZUhSOiBmdW5jdGlvbigpIHtcblx0XHRyZXR1cm4gd3BtZGIuZnVuY3Rpb25zLmNvbnZlcnRLQlNpemVUb0hSKCB0aGlzLmdldCggJ3NpemUnICkgKTtcblx0fSxcblx0c2V0Q29tcGxldGU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuc2V0KCAndHJhbnNmZXJyZWQnLCB0aGlzLmdldCggJ3NpemUnICkgKTtcblx0XHR0aGlzLnNldCggJ3Jvd3NUcmFuc2ZlcnJlZCcsIHRoaXMuZ2V0KCAncm93cycgKSApO1xuXHR9LFxuXHRzZXRSb3dzVHJhbnNmZXJyZWQ6IGZ1bmN0aW9uKCBudW1Sb3dzICkge1xuXHRcdHZhciBhbXREb25lLCBlc3RUcmFuc2ZlcnJlZDtcblxuXHRcdGlmICggLTEgPT09IHBhcnNlSW50KCBudW1Sb3dzICkgKSB7XG5cdFx0XHRhbXREb25lID0gMTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0YW10RG9uZSA9IE1hdGgubWluKCAxLCBudW1Sb3dzIC8gdGhpcy5nZXQoICdyb3dzJyApICk7XG5cdFx0fVxuXG5cdFx0ZXN0VHJhbnNmZXJyZWQgPSB0aGlzLmdldCggJ3NpemUnICkgKiBhbXREb25lO1xuXG5cdFx0dGhpcy5zZXQoICd0cmFuc2ZlcnJlZCcsIGVzdFRyYW5zZmVycmVkICk7XG5cdFx0dGhpcy5zZXQoICdyb3dzVHJhbnNmZXJyZWQnLCBudW1Sb3dzICk7XG5cdH1cbn0gKTtcblxubW9kdWxlLmV4cG9ydHMgPSBNaWdyYXRpb25Qcm9ncmVzc0l0ZW07XG4iLCJ2YXIgJCA9IGpRdWVyeTtcblxudmFyIEl0ZW1Qcm9ncmVzc1ZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCgge1xuXHR0YWdOYW1lOiAnZGl2Jyxcblx0Y2xhc3NOYW1lOiAnaXRlbS1wcm9ncmVzcycsXG5cdGlkOiAnJyxcblx0JHByb2dyZXNzOiBudWxsLFxuXHQkaW5mbzogbnVsbCxcblx0aW5pdGlhbGl6ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kcHJvZ3Jlc3MgPSAkKCAnPGRpdiAvPicgKS5hZGRDbGFzcyggJ3Byb2dyZXNzLWJhcicgKTtcblx0XHR0aGlzLiR0aXRsZSA9ICQoICc8cD4nICkuYWRkQ2xhc3MoICdpdGVtLWluZm8nIClcblx0XHRcdC5hcHBlbmQoICQoICc8c3BhbiBjbGFzcz1uYW1lIC8+JyApLnRleHQoIHRoaXMubW9kZWwuZ2V0KCAnbmFtZScgKSApIClcblx0XHRcdC5hcHBlbmQoICcgJyApXG5cdFx0XHQuYXBwZW5kKCAkKCAnPHNwYW4gY2xhc3M9c2l6ZSAvPicgKS50ZXh0KCAnKCcgKyB0aGlzLm1vZGVsLmdldFNpemVIUigpICsgJyknICkgKTtcblxuXHRcdHRoaXMuJGVsLmFwcGVuZCggdGhpcy4kdGl0bGUgKTtcblx0XHR0aGlzLiRlbC5hcHBlbmQoIHRoaXMuJHByb2dyZXNzICk7XG5cblx0XHR0aGlzLiRlbC5hcHBlbmQoICc8c3BhbiBjbGFzcz1cImRhc2hpY29ucyBkYXNoaWNvbnMteWVzXCIvPicgKTtcblxuXHRcdHRoaXMuJGVsLmF0dHIoICdpZCcsICdpdGVtLScgKyB0aGlzLm1vZGVsLmdldCggJ25hbWUnICkgKTtcblx0XHR0aGlzLiRlbC5hdHRyKCAnZGF0YS1zdGFnZScsIHRoaXMubW9kZWwuZ2V0KCAnc3RhZ2VOYW1lJyApICk7XG5cblx0XHR0aGlzLm1vZGVsLm9uKCAnY2hhbmdlOnRyYW5zZmVycmVkJywgdGhpcy5yZW5kZXIsIHRoaXMgKTtcblx0XHR0aGlzLnJlbmRlcigpO1xuXHR9LFxuXHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBwZXJjZW50RG9uZSA9IE1hdGgubWF4KCAwLCB0aGlzLm1vZGVsLmdldFBlcmNlbnREb25lKCkgKTtcblx0XHR0aGlzLiRwcm9ncmVzcy5jc3MoICd3aWR0aCcsIHBlcmNlbnREb25lICsgJyUnICk7XG5cdFx0aWYgKCAxMDAgPD0gcGVyY2VudERvbmUgKSB7XG5cdFx0XHR0aGlzLmVsZW1Db21wbGV0ZSgpO1xuXHRcdH1cblx0fSxcblx0ZWxlbUNvbXBsZXRlOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy4kZWwuYWRkQ2xhc3MoICdjb21wbGV0ZScgKTtcblx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBoZWlnaHQgPSBzZWxmLiRlbC5oZWlnaHQoKTtcblx0XHRcdHZhciBtYXJnaW5Cb3R0b20gPSBzZWxmLiRlbC5jc3MoICdtYXJnaW4tYm90dG9tJyApO1xuXHRcdFx0dmFyIGNsb25lID0gc2VsZi4kZWwuY2xvbmUoKS5jc3MoIHsgaGVpZ2h0OiAwLCBtYXJnaW5Cb3R0b206IDAgfSApLmFkZENsYXNzKCAnY2xvbmUnICk7XG5cdFx0XHRzZWxmLiRlbC5hbmltYXRlKCB7IGhlaWdodDogMCwgbWFyZ2luQm90dG9tOiAwIH0sIDIwMCwgJ3N3aW5nJyApO1xuXHRcdFx0Y2xvbmUuYXBwZW5kVG8oIHNlbGYuJGVsLnBhcmVudCgpICk7XG5cdFx0XHRjbG9uZS5hbmltYXRlKCB7IGhlaWdodDogaGVpZ2h0LCBtYXJnaW5Cb3R0b206IG1hcmdpbkJvdHRvbSB9LCAyMDAsICdzd2luZycsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRjbG9uZS5yZXBsYWNlV2l0aCggc2VsZi4kZWwuY3NzKCB7IGhlaWdodDogJ2F1dG8nLCBtYXJnaW5Cb3R0b206IG1hcmdpbkJvdHRvbSB9ICkgKTtcblx0XHRcdH0gKTtcblx0XHR9LCAxMDAwICk7XG5cdH1cbn0gKTtcblxubW9kdWxlLmV4cG9ydHMgPSBJdGVtUHJvZ3Jlc3NWaWV3O1xuIiwidmFyIE1pZ3JhdGlvblByb2dyZXNzSXRlbU1vZGVsID0gcmVxdWlyZSggJ01pZ3JhdGlvblByb2dyZXNzSXRlbS1tb2RlbCcgKTtcbnZhciAkID0galF1ZXJ5O1xuXG52YXIgTWlncmF0aW9uUHJvZ3Jlc3NTdGFnZSA9IEJhY2tib25lLk1vZGVsLmV4dGVuZCgge1xuXHRkZWZhdWx0czoge1xuXHRcdHN0YXR1czogJ3F1ZXVlZCcsXG5cdFx0aXRlbU1vZGVsczogbnVsbCxcblx0XHRfaW5pdGlhbEl0ZW1zOiBudWxsLFxuXHRcdGl0ZW1zOiBudWxsLFxuXHRcdHRvdGFsU2l6ZTogMCxcblx0XHRkYXRhVHlwZTogJ2xvY2FsJyxcblx0XHRuYW1lOiAnJyxcblx0XHRzdHJpbmdzOiBudWxsXG5cdH0sXG5cdGluaXRpYWxpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuaW5pdFN0cmluZ3MoKTtcblxuXHRcdHRoaXMuc2V0KCAnX2luaXRpYWxJdGVtcycsIHRoaXMuZ2V0KCAnaXRlbXMnICkgKTtcblx0XHR0aGlzLnNldCggJ2l0ZW1zJywgW10gKTtcblx0XHR0aGlzLnNldCggJ2l0ZW1Nb2RlbHMnLCB7fSApO1xuXHRcdF8uZWFjaCggdGhpcy5nZXQoICdfaW5pdGlhbEl0ZW1zJyApLCBmdW5jdGlvbiggaXRlbSApIHtcblx0XHRcdHRoaXMuYWRkSXRlbSggaXRlbS5uYW1lLCBpdGVtLnNpemUsIGl0ZW0ucm93cyApO1xuXHRcdH0sIHRoaXMgKTtcblxuXHRcdHRoaXMub24oICdjaGFuZ2UnLCBmdW5jdGlvbigpIHtcblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnVwZGF0ZVRpdGxlRWxlbSgpO1xuXHRcdH0gKTtcblx0fSxcblx0aW5pdFN0cmluZ3M6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBkZWZhdWx0X3N0cmluZ3MgPSB7XG5cdFx0XHRzdGFnZV90aXRsZTogdGhpcy5nZXQoICduYW1lJyApLFxuXHRcdFx0bWlncmF0ZWQ6IHdwbWRiX3N0cmluZ3MubWlncmF0ZWQsXG5cdFx0XHRxdWV1ZWQ6IHdwbWRiX3N0cmluZ3MucXVldWVkLFxuXHRcdFx0YWN0aXZlOiB3cG1kYl9zdHJpbmdzLnJ1bm5pbmcsXG5cdFx0XHRjb21wbGV0ZTogd3BtZGJfc3RyaW5ncy5jb21wbGV0ZSxcblx0XHRcdGhpZGU6IHdwbWRiX3N0cmluZ3MuaGlkZSxcblx0XHRcdHNob3c6IHdwbWRiX3N0cmluZ3Muc2hvdyxcblx0XHRcdGl0ZW1zTmFtZTogd3BtZGJfc3RyaW5ncy50YWJsZXNcblx0XHR9O1xuXHRcdHZhciBzdHJpbmdzID0gdGhpcy5nZXQoICdzdHJpbmdzJyApO1xuXG5cdFx0c3RyaW5ncyA9ICggJ29iamVjdCcgPT09IHR5cGVvZiBzdHJpbmdzICkgPyBzdHJpbmdzIDoge307XG5cdFx0c3RyaW5ncyA9ICQuZXh0ZW5kKCBkZWZhdWx0X3N0cmluZ3MsIHN0cmluZ3MgKTtcblxuXHRcdHN0cmluZ3MuaXRlbXNfbWlncmF0ZWQgPSBzdHJpbmdzLml0ZW1zTmFtZSArICcgJyArIHN0cmluZ3MubWlncmF0ZWQ7XG5cdFx0c3RyaW5ncy5oaWRlX2l0ZW1zID0gc3RyaW5ncy5oaWRlICsgJyAnICsgc3RyaW5ncy5pdGVtc05hbWU7XG5cdFx0c3RyaW5ncy5zaG93X2l0ZW1zID0gc3RyaW5ncy5zaG93ICsgJyAnICsgc3RyaW5ncy5pdGVtc05hbWU7XG5cblx0XHR0aGlzLnNldCggJ3N0cmluZ3MnLCBzdHJpbmdzICk7XG5cdH0sXG5cdGFkZEl0ZW06IGZ1bmN0aW9uKCBuYW1lLCBzaXplLCByb3dzICkge1xuXHRcdHZhciBpdGVtID0ge1xuXHRcdFx0bmFtZTogbmFtZSxcblx0XHRcdHNpemU6IHNpemUsXG5cdFx0XHRyb3dzOiByb3dzIHx8IHNpemUsXG5cdFx0XHRzdGFnZU5hbWU6IHRoaXMuZ2V0KCAnbmFtZScgKVxuXHRcdH07XG5cblx0XHR0aGlzLmFkZEl0ZW1Nb2RlbCggaXRlbSApO1xuXHRcdHRoaXMuc2V0KCAndG90YWxTaXplJywgcGFyc2VJbnQoIHRoaXMuZ2V0KCAndG90YWxTaXplJyApICkgKyBwYXJzZUludCggc2l6ZSApICk7XG5cblx0XHR0aGlzLnRyaWdnZXIoICdpdGVtOmFkZGVkJywgdGhpcy5nZXQoICdpdGVtTW9kZWxzJyApWyBuYW1lIF0gKTtcblx0XHR0aGlzLmdldCggJ2l0ZW1Nb2RlbHMnIClbIG5hbWUgXS5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy50cmlnZ2VyKCAnY2hhbmdlJyApO1xuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0YWRkSXRlbU1vZGVsOiBmdW5jdGlvbiggaXRlbSApIHtcblx0XHR2YXIgaXRlbXMgPSB0aGlzLmdldCggJ2l0ZW1zJyApO1xuXHRcdHZhciBpdGVtTW9kZWxzID0gdGhpcy5nZXQoICdpdGVtTW9kZWxzJyApO1xuXHRcdHZhciBuZXdJdGVtTW9kZWwgPSBuZXcgTWlncmF0aW9uUHJvZ3Jlc3NJdGVtTW9kZWwoIGl0ZW0gKTtcblxuXHRcdGl0ZW1zLnB1c2goIGl0ZW0gKTtcblx0XHRpdGVtTW9kZWxzWyBpdGVtLm5hbWUgXSA9IG5ld0l0ZW1Nb2RlbDtcblx0XHR0aGlzLnNldCggJ2l0ZW1zJywgaXRlbXMgKTtcblx0XHR0aGlzLnNldCggJ2l0ZW1Nb2RlbHMnLCBpdGVtTW9kZWxzICk7XG5cdH0sXG5cdGdldEl0ZW1Nb2RlbDogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0cmV0dXJuIHRoaXMuZ2V0KCAnaXRlbU1vZGVscycgKVsgbmFtZSBdO1xuXHR9LFxuXHRzZXRJdGVtQ29tcGxldGU6IGZ1bmN0aW9uKCBuYW1lICkge1xuXHRcdHZhciBpdGVtTW9kZWwgPSB0aGlzLmdldEl0ZW1Nb2RlbCggbmFtZSApO1xuXHRcdGl0ZW1Nb2RlbC5zZXQoICd0cmFuc2ZlcnJlZCcsIGl0ZW1Nb2RlbC5nZXQoICdzaXplJyApICk7XG5cdH0sXG5cdGluY3JlbWVudEl0ZW1Qcm9ncmVzczogZnVuY3Rpb24oIG5hbWUgKSB7XG5cdFx0dmFyIGl0ZW1lTW9kZWwgPSB0aGlzLmdldEl0ZW1Nb2RlbCggbmFtZSApO1xuXHRcdHZhciB0cmFuc2ZlcnJlZCA9IGl0ZW1lTW9kZWwuZ2V0VHJhbnNmZXJyZWQoKTtcblx0XHR2YXIgc2l6ZSA9IGl0ZW1lTW9kZWwuZ2V0KCAnc2l6ZScgKTtcblx0XHR2YXIgaW5jcmVtZW50ID0gdHJhbnNmZXJyZWQgKyAoICggc2l6ZSAtIHRyYW5zZmVycmVkICkgKiAwLjIgKTtcblx0XHRpdGVtZU1vZGVsLnNldCggJ3RyYW5zZmVycmVkJywgaW5jcmVtZW50ICk7XG5cdH0sXG5cdHNldEl0ZW1Nb2RlbFRyYW5zZmVycmVkOiBmdW5jdGlvbiggbmFtZSwgdHJhbnNmZXJyZWQgKSB7XG5cdFx0dGhpcy5nZXRJdGVtTW9kZWwoIG5hbWUgKS5zZXQoICd0cmFuc2ZlcnJlZCcsIHRyYW5zZmVycmVkICk7XG5cdH0sXG5cdGdldEl0ZW1Nb2RlbFRyYW5zZmVycmVkOiBmdW5jdGlvbiggbmFtZSApIHtcblx0XHR2YXIgaXRlbU1vZGVsID0gdGhpcy5nZXRJdGVtTW9kZWwoIG5hbWUgKTtcblx0XHRyZXR1cm4gTWF0aC5tYXgoIGl0ZW1Nb2RlbC5nZXQoICd0cmFuc2ZlcnJlZCcgKSwgaXRlbU1vZGVsLmdldCggJ3NpemUnICkgKTtcblx0fSxcblx0c2V0SXRlbU1vZGVsUm93c1RyYW5zZmVycmVkOiBmdW5jdGlvbiggbmFtZSwgcm93c1RyYW5zZmVycmVkICkge1xuXHRcdHRoaXMuZ2V0SXRlbU1vZGVsKCBuYW1lICkuc2V0Um93c1RyYW5zZmVycmVkKCByb3dzVHJhbnNmZXJyZWQgKTtcblx0fSxcblx0c2V0SXRlbU1vZGVsQ29tcGxldGU6IGZ1bmN0aW9uKCBuYW1lICkge1xuXHRcdHRoaXMuZ2V0SXRlbU1vZGVsKCBuYW1lICkuc2V0Q29tcGxldGUoKTtcblx0fSxcblx0cmVjYWxjdWxhdGVUb3RhbFNpemU6IGZ1bmN0aW9uKCkge1xuXHRcdHZhciBzaXplID0gMDtcblx0XHRfLmVhY2goIHRoaXMuZ2V0KCAnaXRlbU1vZGVscycgKSwgZnVuY3Rpb24oIGl0ZW1Nb2RlbCApIHtcblx0XHRcdHNpemUgKz0gaXRlbU1vZGVsLmdldCggJ3NpemUnICk7XG5cdFx0fSwgdGhpcyApO1xuXHRcdHRoaXMuc2V0KCAndG90YWxTaXplJywgc2l6ZSApO1xuXHRcdHJldHVybiBzaXplO1xuXHR9LFxuXHRnZXRUb3RhbFNpemVUcmFuc2ZlcnJlZDogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHRyYW5zZmVycmVkID0gMDtcblx0XHRfLmVhY2goIHRoaXMuZ2V0KCAnaXRlbU1vZGVscycgKSwgZnVuY3Rpb24oIGl0ZW1Nb2RlbCApIHtcblx0XHRcdHRyYW5zZmVycmVkICs9IGl0ZW1Nb2RlbC5nZXRUcmFuc2ZlcnJlZCgpO1xuXHRcdH0sIHRoaXMgKTtcblx0XHRyZXR1cm4gdHJhbnNmZXJyZWQ7XG5cdH0sXG5cdGdldFRvdGFsUHJvZ3Jlc3NQZXJjZW50OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgdHJhbnNmZXJyZWQgPSB0aGlzLmdldFRvdGFsU2l6ZVRyYW5zZmVycmVkKCk7XG5cdFx0dmFyIHRvdGFsID0gdGhpcy5nZXQoICd0b3RhbFNpemUnICk7XG5cdFx0aWYgKCAwID49IHRyYW5zZmVycmVkIHx8IDAgPj0gdG90YWwgKSB7XG5cdFx0XHRyZXR1cm4gMDtcblx0XHR9XG5cdFx0cmV0dXJuIE1hdGgubWluKCAxMDAsIE1hdGgucm91bmQoICggdHJhbnNmZXJyZWQgLyB0b3RhbCAgKSAqIDEwMCApICk7XG5cdH0sXG5cdGFjdGl2YXRlVGFiOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLnRyaWdnZXIoICdhY3RpdmF0ZVRhYicgKTtcblx0fVxufSApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZ3JhdGlvblByb2dyZXNzU3RhZ2U7XG4iLCJ2YXIgTWlncmF0aW9uUHJvZ3Jlc3NJdGVtVmlldyA9IHJlcXVpcmUoICcuL01pZ3JhdGlvblByb2dyZXNzSXRlbS12aWV3LmpzJyApO1xudmFyICQgPSBqUXVlcnk7XG5cbnZhciBNaWdyYXRpb25Qcm9ncmVzc1N0YWdlVmlldyA9IEJhY2tib25lLlZpZXcuZXh0ZW5kKCB7XG5cdHRhZ05hbWU6ICdkaXYnLFxuXHRjbGFzc05hbWU6ICdtaWdyYXRpb24tcHJvZ3Jlc3Mtc3RhZ2UtY29udGFpbmVyIGhpZGUtdGFibGVzJyxcblx0JHRvdGFsUHJvZ3Jlc3NFbGVtOiBudWxsLFxuXHQkdGFiRWxlbTogbnVsbCxcblx0JHNob3dIaWRlVGFibGVzRWxlbTogbnVsbCxcblx0JHBhdXNlQmVmb3JlRmluYWxpemVFbGVtOiBudWxsLFxuXHQkcGF1c2VCZWZvcmVGaW5hbGl6ZUNoZWNrYm94OiBudWxsLFxuXHRpbml0aWFsaXplOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLiRlbC5lbXB0eSgpO1xuXHRcdHRoaXMuJGVsLmF0dHIoICdkYXRhLXN0YWdlJywgdGhpcy5tb2RlbC5nZXQoICduYW1lJyApICkuYWRkQ2xhc3MoICdxdWV1ZWQnICk7XG5cblx0XHR0aGlzLmluaXRUb3RhbFByb2dyZXNzRWxlbSgpO1xuXHRcdHRoaXMuJGVsLnByZXBlbmQoIHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtICk7XG5cblx0XHR0aGlzLiRlbC5hcHBlbmQoICc8ZGl2IGNsYXNzPXByb2dyZXNzLWl0ZW1zIC8+JyApO1xuXG5cdFx0dGhpcy5pbml0VGFiRWxlbSgpO1xuXG5cdFx0dGhpcy5tb2RlbC5vbiggJ2l0ZW06YWRkZWQnLCBmdW5jdGlvbiggaXRlbU1vZGVsICkge1xuXHRcdFx0dGhpcy5hZGRJdGVtVmlldyggaXRlbU1vZGVsICk7XG5cdFx0fSwgdGhpcyApO1xuXHRcdF8uZWFjaCggdGhpcy5tb2RlbC5nZXQoICdpdGVtTW9kZWxzJyApLCB0aGlzLmFkZEl0ZW1WaWV3LCB0aGlzICk7XG5cdFx0dGhpcy5tb2RlbC5vbiggJ2NoYW5nZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dGhpcy51cGRhdGVQcm9ncmVzc0VsZW0oKTtcblx0XHR9LCB0aGlzICk7XG5cblx0XHR0aGlzLm1vZGVsLm9uKCAnY2hhbmdlOnN0YXR1cycsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0dGhpcy4kZWwucmVtb3ZlQ2xhc3MoICdxdWV1ZWQgYWN0aXZlJyApLmFkZENsYXNzKCB0aGlzLm1vZGVsLmdldCggJ3N0YXR1cycgKSApO1xuXHRcdFx0dGhpcy4kdGFiRWxlbS5yZW1vdmVDbGFzcyggJ3F1ZXVlZCBhY3RpdmUnICkuYWRkQ2xhc3MoIHRoaXMubW9kZWwuZ2V0KCAnc3RhdHVzJyApIClcblx0XHRcdFx0LmZpbmQoICcuc3RhZ2Utc3RhdHVzJyApLnRleHQoIHRoaXMubW9kZWwuZ2V0KCAnc3RyaW5ncycgKVsgdGhpcy5tb2RlbC5nZXQoICdzdGF0dXMnICkgXSApO1xuXHRcdH0sIHRoaXMgKTtcblx0fSxcblx0aW5pdFRvdGFsUHJvZ3Jlc3NFbGVtOiBmdW5jdGlvbigpIHtcblx0XHR0aGlzLmluaXRTaG93SGlkZVRhYmxlc0VsZW0oKTtcblx0XHR0aGlzLmluaXRQYXVzZUJlZm9yZUZpbmFsaXplRWxlbSgpO1xuXG5cdFx0dGhpcy4kdG90YWxQcm9ncmVzc0VsZW0gPSAkKCAnPGRpdiBjbGFzcz1zdGFnZS1wcm9ncmVzcyAvPicgKVxuXHRcdFx0LmFwcGVuZCggJzxzcGFuIGNsYXNzPXBlcmNlbnQtY29tcGxldGU+MDwvc3Bhbj4lICcgKyB0aGlzLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuY29tcGxldGUgKyAnICcgKVxuXHRcdFx0LmFwcGVuZCggJyg8c3BhbiBjbGFzcz1zaXplLWNvbXBsZXRlPjAgTUI8L3NwYW4+IC8gPHNwYW4gY2xhc3M9c2l6ZS10b3RhbD4wIE1CPC9zcGFuPikgJyApXG5cdFx0XHQuYXBwZW5kKCAnPHNwYW4gY2xhc3M9dGFibGVzLWNvbXBsZXRlPjA8L3NwYW4+IDxzcGFuIGNsYXNzPWxvd2VyY2FzZSA+b2Y8L3NwYW4+IDxzcGFuIGNsYXNzPXRhYmxlcy10b3RhbD4wPC9zcGFuPiAnICsgdGhpcy5tb2RlbC5nZXQoICdzdHJpbmdzJyApLml0ZW1zX21pZ3JhdGVkIClcblx0XHRcdC5hcHBlbmQoIHRoaXMuJHNob3dIaWRlVGFibGVzRWxlbSApXG5cdFx0XHQuYXBwZW5kKCAnPGRpdiBjbGFzcz1wcm9ncmVzcy1iYXItd3JhcHBlcj48ZGl2IGNsYXNzPXByb2dyZXNzLWJhciAvPjwvZGl2PicgKTtcblx0fSxcblx0aW5pdFNob3dIaWRlVGFibGVzRWxlbTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kc2hvd0hpZGVUYWJsZXNFbGVtID0gJCggJzxhIGNsYXNzPXNob3ctaGlkZS10YWJsZXMvPicgKS50ZXh0KCB0aGlzLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuc2hvd19pdGVtcyApO1xuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLiRzaG93SGlkZVRhYmxlc0VsZW0ub24oICdjbGljayBzaG93LWhpZGUtcHJvZ3Jlc3MtdGFibGVzJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcHJvZ1RhYmxlc0hpZGRlbjtcblx0XHRcdGlmICggc2VsZi4kZWwuaGFzQ2xhc3MoICdoaWRlLXRhYmxlcycgKSApIHsgLy8gc2hvdyB0YWJsZXNcblx0XHRcdFx0cHJvZ1RhYmxlc0hpZGRlbiA9IGZhbHNlO1xuXHRcdFx0XHRzZWxmLiRlbC5hZGQoIHNlbGYuJGVsLnNpYmxpbmdzKCkgKS5yZW1vdmVDbGFzcyggJ2hpZGUtdGFibGVzJyApO1xuXHRcdFx0XHRzZWxmLiRzaG93SGlkZVRhYmxlc0VsZW0udGV4dCggc2VsZi5tb2RlbC5nZXQoICdzdHJpbmdzJyApLmhpZGVfaXRlbXMgKTtcblx0XHRcdH0gZWxzZSB7IC8vIGhpZGUgdGFibGVzXG5cdFx0XHRcdHByb2dUYWJsZXNIaWRkZW4gPSB0cnVlO1xuXHRcdFx0XHRzZWxmLiRlbC5hZGQoIHNlbGYuJGVsLnNpYmxpbmdzKCkgKS5hZGRDbGFzcyggJ2hpZGUtdGFibGVzJyApO1xuXHRcdFx0XHRzZWxmLiRzaG93SGlkZVRhYmxlc0VsZW0udGV4dCggc2VsZi5tb2RlbC5nZXQoICdzdHJpbmdzJyApLnNob3dfaXRlbXMgKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCBCb29sZWFuKCBwcm9nVGFibGVzSGlkZGVuICkgIT09IEJvb2xlYW4oIHdwbWRiX2RhdGEucHJvZ190YWJsZXNfaGlkZGVuICkgKSB7XG5cdFx0XHRcdHdwbWRiX2RhdGEucHJvZ190YWJsZXNfdmlzaWJpbGl0eV9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0d3BtZGJfZGF0YS5wcm9nX3RhYmxlc19oaWRkZW4gPSBwcm9nVGFibGVzSGlkZGVuO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdC8vIHNob3cgcHJvZ3Jlc3MgdGFibGVzIG9uIGluaXQgaWYgaGlkZGVuIGlzIGZhbHNlXG5cdFx0aWYgKCAhIHdwbWRiX2RhdGEucHJvZ190YWJsZXNfaGlkZGVuICkge1xuXHRcdFx0dGhpcy4kc2hvd0hpZGVUYWJsZXNFbGVtLnRyaWdnZXJIYW5kbGVyKCAnc2hvdy1oaWRlLXByb2dyZXNzLXRhYmxlcycgKTtcblx0XHR9XG5cblx0XHQvLyBtYWtlIHN1cmUgdGV4dCByZWZsZWN0cyBjdXJyZW50IHN0YXRlIHdoZW4gc2hvd2luZ1xuXHRcdHRoaXMubW9kZWwub24oICdjaGFuZ2U6c3RhdHVzIGFjdGl2YXRlVGFiJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIHdwbWRiX2RhdGEucHJvZ190YWJsZXNfaGlkZGVuICkge1xuXHRcdFx0XHRzZWxmLiRzaG93SGlkZVRhYmxlc0VsZW0udGV4dCggc2VsZi5tb2RlbC5nZXQoICdzdHJpbmdzJyApLnNob3dfaXRlbXMgKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHNlbGYuJHNob3dIaWRlVGFibGVzRWxlbS50ZXh0KCBzZWxmLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuaGlkZV9pdGVtcyApO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdHRoaXMubW9kZWwub24oICdhY3RpdmF0ZVRhYicsIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAnY29tcGxldGUnID09PSB3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXQoICdtaWdyYXRpb25TdGF0dXMnICkgKSB7XG5cdFx0XHRcdHNlbGYuJHRhYkVsZW0uYWRkQ2xhc3MoICdhY3RpdmUnICkuc2libGluZ3MoKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdFx0c2VsZi4kZWwuYWRkQ2xhc3MoICdhY3RpdmUnICkuc2libGluZ3MoKS5yZW1vdmVDbGFzcyggJ2FjdGl2ZScgKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cdH0sXG5cdGluaXRQYXVzZUJlZm9yZUZpbmFsaXplRWxlbTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy4kcGF1c2VCZWZvcmVGaW5hbGl6ZUVsZW0gPSAkKCAnLnBhdXNlLWJlZm9yZS1maW5hbGl6ZScgKTtcblx0XHR0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplQ2hlY2tib3ggPSB0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplRWxlbS5maW5kKCAnaW5wdXRbdHlwZT1jaGVja2JveF0nICk7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHZhciBpc0NoZWNrZWQgPSBmYWxzZTtcblx0XHR2YXIgbWlncmF0aW9uSW50ZW50ID0gd3BtZGIuY3VycmVudF9taWdyYXRpb24ubW9kZWwuZ2V0KCAnbWlncmF0aW9uSW50ZW50JyApO1xuXG5cdFx0Ly8gbWFrZSBzdXJlIGNoZWNrYm94IGlzIGNoZWNrZWQgYmFzZWQgb24gY3VycmVudCBzdGF0ZVxuXHRcdGlmICggd3BtZGJfZGF0YS5wYXVzZV9iZWZvcmVfZmluYWxpemUgKSB7XG5cdFx0XHRpc0NoZWNrZWQgPSB0cnVlO1xuXHRcdH1cblx0XHR0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplQ2hlY2tib3gucHJvcCggJ2NoZWNrZWQnLCBpc0NoZWNrZWQgKTtcblxuXHRcdC8vIG9ubHkgZGlzcGxheSBvbiBwdXNoZXMgYW5kIHB1bGxzXG5cdFx0aWYgKCAncHVzaCcgPT09IG1pZ3JhdGlvbkludGVudCB8fCAncHVsbCcgPT09IG1pZ3JhdGlvbkludGVudCApIHtcblx0XHRcdHRoaXMuJHBhdXNlQmVmb3JlRmluYWxpemVFbGVtLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dGhpcy4kcGF1c2VCZWZvcmVGaW5hbGl6ZUVsZW0uaGlkZSgpO1xuXHRcdH1cblxuXHRcdC8vIGhpZGUgb24gbWVkaWEgc3RhZ2Vcblx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5vbiggJ2NoYW5nZTphY3RpdmVTdGFnZScsIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAnbWVkaWEnID09PSB3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXQoICdhY3RpdmVTdGFnZU5hbWUnICkgKSB7XG5cdFx0XHRcdHNlbGYuJHBhdXNlQmVmb3JlRmluYWxpemVFbGVtLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHR0aGlzLiRwYXVzZUJlZm9yZUZpbmFsaXplRWxlbS5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgcGF1c2VCZWZvcmVGaW5hbGl6ZVZhbHVlID0gQm9vbGVhbiggc2VsZi4kcGF1c2VCZWZvcmVGaW5hbGl6ZUNoZWNrYm94LmlzKCAnOmNoZWNrZWQnICkgKTtcblx0XHRcdGlmICggcGF1c2VCZWZvcmVGaW5hbGl6ZVZhbHVlICE9PSBCb29sZWFuKCB3cG1kYl9kYXRhLnBhdXNlX2JlZm9yZV9maW5hbGl6ZSApICkge1xuXHRcdFx0XHR3cG1kYl9kYXRhLnBhdXNlX2JlZm9yZV9maW5hbGl6ZV9jaGFuZ2VkID0gdHJ1ZTtcblx0XHRcdFx0d3BtZGJfZGF0YS5wYXVzZV9iZWZvcmVfZmluYWxpemUgPSBwYXVzZUJlZm9yZUZpbmFsaXplVmFsdWU7XG5cdFx0XHR9XG5cdFx0fSApO1xuXHR9LFxuXHRpbml0VGFiRWxlbTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXHRcdHRoaXMuJHRhYkVsZW0gPSAkKCAnPGEgY2xhc3M9c3RhZ2UtdGFiPicgKVxuXHRcdFx0LmFwcGVuZCggJzxzcGFuIGNsYXNzPXN0YWdlLXRpdGxlPicgKyB0aGlzLm1vZGVsLmdldCggJ3N0cmluZ3MnICkuc3RhZ2VfdGl0bGUgKyAnPC9zcGFuPiAnIClcblx0XHRcdC5hcHBlbmQoICc8c3BhbiBjbGFzcz1zdGFnZS1zdGF0dXM+JyArIHRoaXMubW9kZWwuZ2V0KCAnc3RyaW5ncycgKS5xdWV1ZWQgKyAnPC9zcGFuPiAnIClcblx0XHRcdC5vbiggJ2NsaWNrJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYubW9kZWwuYWN0aXZhdGVUYWIoKTtcblx0XHRcdH0gKTtcblx0fSxcblx0dXBkYXRlUHJvZ3Jlc3NFbGVtOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgcGVyY2VudERvbmUgPSBNYXRoLm1heCggMCwgdGhpcy5tb2RlbC5nZXRUb3RhbFByb2dyZXNzUGVyY2VudCgpICk7XG5cdFx0dmFyIHNpemVEb25lID0gd3BtZGIuZnVuY3Rpb25zLmNvbnZlcnRLQlNpemVUb0hSKCBNYXRoLm1pbiggdGhpcy5tb2RlbC5nZXRUb3RhbFNpemVUcmFuc2ZlcnJlZCgpLCB0aGlzLm1vZGVsLmdldCggJ3RvdGFsU2l6ZScgKSApICk7XG5cdFx0dmFyIHRhYmxlc0RvbmUgPSBNYXRoLm1pbiggdGhpcy4kZWwuZmluZCggJy5jb21wbGV0ZScgKS5sZW5ndGgsIHRoaXMubW9kZWwuZ2V0KCAnaXRlbXMnICkubGVuZ3RoICk7XG5cblx0XHRpZiAoICdjb21wbGV0ZScgPT09IHRoaXMubW9kZWwuZ2V0KCAnc3RhdHVzJyApICYmIDAgPT09IHRoaXMubW9kZWwuZ2V0KCAndG90YWxTaXplJyApICkge1xuXHRcdFx0cGVyY2VudERvbmUgPSAxMDA7XG5cdFx0XHR0aGlzLiRzaG93SGlkZVRhYmxlc0VsZW0uZmFkZU91dCgpO1xuXHRcdH1cblxuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcucGVyY2VudC1jb21wbGV0ZScgKS50ZXh0KCBwZXJjZW50RG9uZSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcuc2l6ZS1jb21wbGV0ZScgKS50ZXh0KCBzaXplRG9uZSApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcudGFibGVzLWNvbXBsZXRlJyApLnRleHQoIHRhYmxlc0RvbmUgKTtcblx0XHR0aGlzLiR0b3RhbFByb2dyZXNzRWxlbS5maW5kKCAnLnByb2dyZXNzLWJhci13cmFwcGVyIC5wcm9ncmVzcy1iYXInICkuY3NzKCB7IHdpZHRoOiBwZXJjZW50RG9uZSArICclJyB9ICk7XG5cdH0sXG5cdGFkZEl0ZW1WaWV3OiBmdW5jdGlvbiggaXRlbU1vZGVsICkge1xuXHRcdHZhciBuZXdJdGVtU3ViVmlldyA9IG5ldyBNaWdyYXRpb25Qcm9ncmVzc0l0ZW1WaWV3KCB7XG5cdFx0XHRtb2RlbDogaXRlbU1vZGVsXG5cdFx0fSApO1xuXHRcdHRoaXMuJGVsLmZpbmQoICcucHJvZ3Jlc3MtaXRlbXMnICkuYXBwZW5kKCBuZXdJdGVtU3ViVmlldy4kZWwgKTtcblx0XHR0aGlzLiR0b3RhbFByb2dyZXNzRWxlbS5maW5kKCAnLnRhYmxlcy10b3RhbCcgKS50ZXh0KCB0aGlzLm1vZGVsLmdldCggJ2l0ZW1zJyApLmxlbmd0aCApO1xuXHRcdHRoaXMuJHRvdGFsUHJvZ3Jlc3NFbGVtLmZpbmQoICcuc2l6ZS10b3RhbCcgKS50ZXh0KCB3cG1kYi5mdW5jdGlvbnMuY29udmVydEtCU2l6ZVRvSFIoIHRoaXMubW9kZWwuZ2V0KCAndG90YWxTaXplJyApICkgKTtcblx0fVxufSApO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1pZ3JhdGlvblByb2dyZXNzU3RhZ2VWaWV3O1xuIiwiKGZ1bmN0aW9uKCAkLCB3cG1kYiApIHtcblxuXHR2YXIgY29ubmVjdGlvbl9lc3RhYmxpc2hlZCA9IGZhbHNlO1xuXHR2YXIgbGFzdF9yZXBsYWNlX3N3aXRjaCA9ICcnO1xuXHR2YXIgZG9pbmdfYWpheCA9IGZhbHNlO1xuXHR2YXIgZG9pbmdfbGljZW5jZV9yZWdpc3RyYXRpb25fYWpheCA9IGZhbHNlO1xuXHR2YXIgZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ID0gZmFsc2U7XG5cdHZhciBkb2luZ19zYXZlX3Byb2ZpbGUgPSBmYWxzZTtcblx0dmFyIGRvaW5nX3BsdWdpbl9jb21wYXRpYmlsaXR5X2FqYXggPSBmYWxzZTtcblx0dmFyIHByb2ZpbGVfbmFtZV9lZGl0ZWQgPSBmYWxzZTtcblx0dmFyIGNoZWNrZWRfbGljZW5jZSA9IGZhbHNlO1xuXHR2YXIgc2hvd19wcmVmaXhfbm90aWNlID0gZmFsc2U7XG5cdHZhciBzaG93X3NzbF9ub3RpY2UgPSBmYWxzZTtcblx0dmFyIHNob3dfdmVyc2lvbl9ub3RpY2UgPSBmYWxzZTtcblx0dmFyIG1pZ3JhdGlvbl9jb21wbGV0ZWQgPSBmYWxzZTtcblx0dmFyIGN1cnJlbnRseV9taWdyYXRpbmcgPSBmYWxzZTtcblx0dmFyIGR1bXBfZmlsZW5hbWUgPSAnJztcblx0dmFyIGR1bXBfcGF0aCA9ICcnO1xuXHR2YXIgbWlncmF0aW9uX2ludGVudDtcblx0dmFyIHJlbW90ZV9zaXRlO1xuXHR2YXIgc2VjcmV0X2tleTtcblx0dmFyIGZvcm1fZGF0YTtcblx0dmFyIHN0YWdlO1xuXHR2YXIgZWxhcHNlZF9pbnRlcnZhbDtcblx0dmFyIGNvbXBsZXRlZF9tc2c7XG5cdHZhciB0YWJsZXNfdG9fbWlncmF0ZSA9ICcnO1xuXHR2YXIgbWlncmF0aW9uX3BhdXNlZCA9IGZhbHNlO1xuXHR2YXIgcHJldmlvdXNfcHJvZ3Jlc3NfdGl0bGUgPSAnJztcblx0dmFyIHByZXZpb3VzX3Byb2dyZXNzX3RleHRfcHJpbWFyeSA9ICcnO1xuXHR2YXIgcHJldmlvdXNfcHJvZ3Jlc3NfdGV4dF9zZWNvbmRhcnkgPSAnJztcblx0dmFyIG1pZ3JhdGlvbl9jYW5jZWxsZWQgPSBmYWxzZTtcblx0dmFyIGZsYWdfc2tpcF9kZWxheSA9IGZhbHNlO1xuXHR2YXIgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cyA9IDA7XG5cdHZhciBmYWRlX2R1cmF0aW9uID0gNDAwO1xuXHR2YXIgcGF1c2VfYmVmb3JlX2ZpbmFsaXplID0gZmFsc2U7XG5cdHZhciBpc19hdXRvX3BhdXNlX2JlZm9yZV9maW5hbGl6ZSA9IGZhbHNlO1xuXG5cdHdwbWRiLm1pZ3JhdGlvbl9wcm9ncmVzc19jb250cm9sbGVyID0gcmVxdWlyZSggJ01pZ3JhdGlvblByb2dyZXNzLWNvbnRyb2xsZXInICk7XG5cdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uID0gbnVsbDtcblxuXHR2YXIgYWRtaW5fdXJsID0gYWpheHVybC5yZXBsYWNlKCAnL2FkbWluLWFqYXgucGhwJywgJycgKSwgc3Bpbm5lcl91cmwgPSBhZG1pbl91cmwgKyAnL2ltYWdlcy9zcGlubmVyJztcblxuXHRpZiAoIDIgPCB3aW5kb3cuZGV2aWNlUGl4ZWxSYXRpbyApIHtcblx0XHRzcGlubmVyX3VybCArPSAnLTJ4Jztcblx0fVxuXHRzcGlubmVyX3VybCArPSAnLmdpZic7XG5cdHZhciBhamF4X3NwaW5uZXIgPSAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJhamF4LXNwaW5uZXIgZ2VuZXJhbC1zcGlubmVyXCIgLz4nO1xuXG5cdHdpbmRvdy5vbmJlZm9yZXVubG9hZCA9IGZ1bmN0aW9uKCBlICkge1xuXHRcdGlmICggY3VycmVudGx5X21pZ3JhdGluZyApIHtcblx0XHRcdGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcblxuXHRcdFx0Ly8gRm9yIElFIGFuZCBGaXJlZm94IHByaW9yIHRvIHZlcnNpb24gNFxuXHRcdFx0aWYgKCBlICkge1xuXHRcdFx0XHRlLnJldHVyblZhbHVlID0gd3BtZGJfc3RyaW5ncy5zdXJlO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBGb3IgU2FmYXJpXG5cdFx0XHRyZXR1cm4gd3BtZGJfc3RyaW5ncy5zdXJlO1xuXHRcdH1cblx0fTtcblxuXHRmdW5jdGlvbiBwYWQoIG4sIHdpZHRoLCB6ICkge1xuXHRcdHogPSB6IHx8ICcwJztcblx0XHRuID0gbiArICcnO1xuXHRcdHJldHVybiBuLmxlbmd0aCA+PSB3aWR0aCA/IG4gOiBuZXcgQXJyYXkoIHdpZHRoIC0gbi5sZW5ndGggKyAxICkuam9pbiggeiApICsgbjtcblx0fVxuXG5cdGZ1bmN0aW9uIGlzX2ludCggbiApIHtcblx0XHRuID0gcGFyc2VJbnQoIG4gKTtcblx0XHRyZXR1cm4gJ251bWJlcicgPT09IHR5cGVvZiBuICYmIDAgPT09IG4gJSAxO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0X2ludGVyc2VjdCggYXJyMSwgYXJyMiApIHtcblx0XHR2YXIgciA9IFtdLCBvID0ge30sIGwgPSBhcnIyLmxlbmd0aCwgaSwgdjtcblx0XHRmb3IgKCBpID0gMDsgaSA8IGw7IGkrKyApIHtcblx0XHRcdG9bIGFycjJbIGkgXSBdID0gdHJ1ZTtcblx0XHR9XG5cdFx0bCA9IGFycjEubGVuZ3RoO1xuXHRcdGZvciAoIGkgPSAwOyBpIDwgbDsgaSsrICkge1xuXHRcdFx0diA9IGFycjFbIGkgXTtcblx0XHRcdGlmICggdiBpbiBvICkge1xuXHRcdFx0XHRyLnB1c2goIHYgKTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIHI7XG5cdH1cblxuXHRmdW5jdGlvbiBnZXRfcXVlcnlfdmFyKCBuYW1lICkge1xuXHRcdG5hbWUgPSBuYW1lLnJlcGxhY2UoIC9bXFxbXS8sICdcXFxcWycgKS5yZXBsYWNlKCAvW1xcXV0vLCAnXFxcXF0nICk7XG5cdFx0dmFyIHJlZ2V4ID0gbmV3IFJlZ0V4cCggJ1tcXFxcPyZdJyArIG5hbWUgKyAnPShbXiYjXSopJyApLFxuXHRcdFx0cmVzdWx0cyA9IHJlZ2V4LmV4ZWMoIGxvY2F0aW9uLnNlYXJjaCApO1xuXHRcdHJldHVybiBudWxsID09PSByZXN1bHRzID8gJycgOiBkZWNvZGVVUklDb21wb25lbnQoIHJlc3VsdHNbIDEgXS5yZXBsYWNlKCAvXFwrL2csICcgJyApICk7XG5cdH1cblxuXHRmdW5jdGlvbiBtYXliZV9zaG93X3NzbF93YXJuaW5nKCB1cmwsIGtleSwgcmVtb3RlX3NjaGVtZSApIHtcblx0XHR2YXIgc2NoZW1lID0gdXJsLnN1YnN0ciggMCwgdXJsLmluZGV4T2YoICc6JyApICk7XG5cdFx0aWYgKCByZW1vdGVfc2NoZW1lICE9PSBzY2hlbWUgJiYgdXJsLmluZGV4T2YoICdodHRwcycgKSAhPT0gLTEgKSB7XG5cdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuc2hvdygpO1xuXHRcdFx0c2hvd19zc2xfbm90aWNlID0gdHJ1ZTtcblx0XHRcdHVybCA9IHVybC5yZXBsYWNlKCAnaHR0cHMnLCAnaHR0cCcgKTtcblx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoIHVybCArICdcXG4nICsga2V5ICk7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHNob3dfc3NsX25vdGljZSA9IGZhbHNlO1xuXHRcdHJldHVybjtcblx0fVxuXG5cdGZ1bmN0aW9uIG1heWJlX3Nob3dfcHJlZml4X25vdGljZSggcHJlZml4ICkge1xuXHRcdGlmICggcHJlZml4ICE9PSB3cG1kYl9kYXRhLnRoaXNfcHJlZml4ICkge1xuXHRcdFx0JCggJy5yZW1vdGUtcHJlZml4JyApLmh0bWwoIHByZWZpeCApO1xuXHRcdFx0c2hvd19wcmVmaXhfbm90aWNlID0gdHJ1ZTtcblx0XHRcdGlmICggJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHQkKCAnLnByZWZpeC1ub3RpY2UucHVsbCcgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnByZWZpeC1ub3RpY2UucHVzaCcgKS5zaG93KCk7XG5cdFx0XHR9XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gbWF5YmVfc2hvd19taXhlZF9jYXNlZF90YWJsZV9uYW1lX3dhcm5pbmcoKSB7XG5cdFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgfHwgZmFsc2UgPT09IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dmFyIG1pZ3JhdGlvbl9pbnRlbnQgPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXHRcdHZhciB0YWJsZXNfdG9fbWlncmF0ZSA9IGdldF90YWJsZXNfdG9fbWlncmF0ZSggbnVsbCwgbnVsbCApO1xuXG5cdFx0JCggJy5taXhlZC1jYXNlLXRhYmxlLW5hbWUtbm90aWNlJyApLmhpZGUoKTtcblxuXHRcdGlmICggbnVsbCA9PT0gdGFibGVzX3RvX21pZ3JhdGUgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0dGFibGVzX3RvX21pZ3JhdGUgPSB0YWJsZXNfdG9fbWlncmF0ZS5qb2luKCAnJyApO1xuXG5cdFx0Ly8gVGhlIHRhYmxlIG5hbWVzIGFyZSBhbGwgbG93ZXJjYXNlLCBubyBuZWVkIHRvIGRpc3BsYXkgdGhlIHdhcm5pbmcuXG5cdFx0aWYgKCB0YWJsZXNfdG9fbWlncmF0ZSA9PT0gdGFibGVzX3RvX21pZ3JhdGUudG9Mb3dlckNhc2UoKSApIHtcblx0XHRcdHJldHVybjtcblx0XHR9XG5cblx0XHQvKlxuXHRcdCAqIERvIG5vdCBkaXNwbGF5IHRoZSB3YXJuaW5nIGlmIHRoZSByZW1vdGUgbG93ZXJfY2FzZV90YWJsZV9uYW1lcyBkb2VzIG5vdCBlcXVhbCBcIjFcIiAoaS5lIHRoZSBvbmx5IHByb2JsZW1hdGljIHNldHRpbmcpXG5cdFx0ICogQXBwbGllcyB0byBwdXNoL2V4cG9ydCBtaWdyYXRpb25zLlxuXHRcdCAqL1xuXHRcdGlmICggJzEnICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLmxvd2VyX2Nhc2VfdGFibGVfbmFtZXMgJiYgKCAncHVzaCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgfHwgJ3NhdmVmaWxlJyA9PT0gbWlncmF0aW9uX2ludGVudCApICkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdC8qXG5cdFx0ICogRG8gbm90IGRpc3BsYXkgdGhlIHdhcm5pbmcgaWYgdGhlIGxvY2FsIGxvd2VyX2Nhc2VfdGFibGVfbmFtZXMgZG9lcyBub3QgZXF1YWwgXCIxXCIgKGkuZSB0aGUgb25seSBwcm9ibGVtYXRpYyBzZXR0aW5nKVxuXHRcdCAqIE9ubHkgYXBwbGllcyB0byBwdWxsIG1pZ3JhdGlvbnMuXG5cdFx0ICovXG5cdFx0aWYgKCAnMScgIT09IHdwbWRiX2RhdGEubG93ZXJfY2FzZV90YWJsZV9uYW1lcyAmJiAncHVsbCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXG5cdFx0Lypcblx0XHQgKiBBdCB0aGlzIHN0YWdlIHdlJ3ZlIGRldGVybWluZWQ6XG5cdFx0ICogMS4gVGhlIHNvdXJjZSBkYXRhYmFzZSBjb250YWlucyBhdCBsZWFzdCBvbmUgdGFibGUgdGhhdCBjb250YWlucyBhbiB1cHBlcmNhc2UgY2hhcmFjdGVyLlxuXHRcdCAqIDIuIFRoZSBkZXN0aW5hdGlvbiBlbnZpcm9ubWVudCBoYXMgbG93ZXJfY2FzZV90YWJsZV9uYW1lcyBzZXQgdG8gMS5cblx0XHQgKiAzLiBUaGUgc291cmNlIGRhdGFiYXNlIHRhYmxlIGNvbnRhaW5pbmcgdGhlIHVwcGVyY2FzZSBsZXR0ZXIgd2lsbCBiZSBjb252ZXJ0ZWQgdG8gbG93ZXJjYXNlIGR1cmluZyB0aGUgbWlncmF0aW9uLlxuXHRcdCAqL1xuXG5cdFx0aWYgKCAncHVzaCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgfHwgJ3NhdmVmaWxlJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdCQoICcubWl4ZWQtY2FzZS10YWJsZS1uYW1lLW5vdGljZS5wdXNoJyApLnNob3coKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0JCggJy5taXhlZC1jYXNlLXRhYmxlLW5hbWUtbm90aWNlLnB1bGwnICkuc2hvdygpO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIGdldF9kb21haW5fbmFtZSggdXJsICkge1xuXHRcdHZhciB0ZW1wX3VybCA9IHVybDtcblx0XHR2YXIgZG9tYWluID0gdGVtcF91cmwucmVwbGFjZSggL1xcL1xcLyguKilALywgJy8vJyApLnJlcGxhY2UoICdodHRwOi8vJywgJycgKS5yZXBsYWNlKCAnaHR0cHM6Ly8nLCAnJyApLnJlcGxhY2UoICd3d3cuJywgJycgKTtcblx0XHRyZXR1cm4gZG9tYWluO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0X21pZ3JhdGlvbl9zdGF0dXNfbGFiZWwoIHVybCwgaW50ZW50LCBzdGFnZSApIHtcblx0XHR2YXIgZG9tYWluID0gZ2V0X2RvbWFpbl9uYW1lKCB1cmwgKTtcblx0XHR2YXIgbWlncmF0aW5nX3N0YWdlX2xhYmVsLCBjb21wbGV0ZWRfc3RhZ2VfbGFiZWw7XG5cdFx0aWYgKCAncHVsbCcgPT09IGludGVudCApIHtcblx0XHRcdG1pZ3JhdGluZ19zdGFnZV9sYWJlbCA9IHdwbWRiX3N0cmluZ3MucHVsbF9taWdyYXRpb25fbGFiZWxfbWlncmF0aW5nO1xuXHRcdFx0Y29tcGxldGVkX3N0YWdlX2xhYmVsID0gd3BtZGJfc3RyaW5ncy5wdWxsX21pZ3JhdGlvbl9sYWJlbF9jb21wbGV0ZWQ7XG5cdFx0fSBlbHNlIHtcblx0XHRcdG1pZ3JhdGluZ19zdGFnZV9sYWJlbCA9IHdwbWRiX3N0cmluZ3MucHVzaF9taWdyYXRpb25fbGFiZWxfbWlncmF0aW5nO1xuXHRcdFx0Y29tcGxldGVkX3N0YWdlX2xhYmVsID0gd3BtZGJfc3RyaW5ncy5wdXNoX21pZ3JhdGlvbl9sYWJlbF9jb21wbGV0ZWQ7XG5cdFx0fVxuXG5cdFx0bWlncmF0aW5nX3N0YWdlX2xhYmVsID0gbWlncmF0aW5nX3N0YWdlX2xhYmVsLnJlcGxhY2UoIC9cXCVzKFxcUyopXFxzPy8sICc8c3BhbiBjbGFzcz1kb21haW4tbGFiZWw+JyArIGRvbWFpbiArICckMTwvc3Bhbj4mbmJzcDsnICk7XG5cdFx0Y29tcGxldGVkX3N0YWdlX2xhYmVsID0gY29tcGxldGVkX3N0YWdlX2xhYmVsLnJlcGxhY2UoIC9cXCVzXFxzPy8sICc8c3BhbiBjbGFzcz1kb21haW4tbGFiZWw+JyArIGRvbWFpbiArICc8L3NwYW4+Jm5ic3A7JyApO1xuXG5cdFx0aWYgKCAnbWlncmF0aW5nJyA9PT0gc3RhZ2UgKSB7XG5cdFx0XHRyZXR1cm4gbWlncmF0aW5nX3N0YWdlX2xhYmVsO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRyZXR1cm4gY29tcGxldGVkX3N0YWdlX2xhYmVsO1xuXHRcdH1cblx0fVxuXG5cdGZ1bmN0aW9uIHJlbW92ZV9wcm90b2NvbCggdXJsICkge1xuXHRcdHJldHVybiB1cmwucmVwbGFjZSggL15odHRwcz86L2ksICcnICk7XG5cdH1cblxuXHRmdW5jdGlvbiBkaXNhYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCkge1xuXHRcdCQoICcub3B0aW9uLWdyb3VwJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRcdCQoICdpbnB1dCcsIHRoaXMgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnICk7XG5cdFx0XHQkKCAnbGFiZWwnLCB0aGlzICkuY3NzKCAnY3Vyc29yJywgJ2RlZmF1bHQnICk7XG5cdFx0fSApO1xuXHR9XG5cblx0ZnVuY3Rpb24gZW5hYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCkge1xuXHRcdCQoICcub3B0aW9uLWdyb3VwJyApLmVhY2goIGZ1bmN0aW9uKCBpbmRleCApIHtcblx0XHRcdCQoICdpbnB1dCcsIHRoaXMgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHQkKCAnbGFiZWwnLCB0aGlzICkuY3NzKCAnY3Vyc29yJywgJ3BvaW50ZXInICk7XG5cdFx0fSApO1xuXHR9XG5cblx0ZnVuY3Rpb24gc2V0X3NsaWRlcl92YWx1ZSggcGFyZW50X3NlbGVjdG9yLCB2YWx1ZSwgdW5pdCwgZGlzcGxheSApIHtcblx0XHR2YXIgZGlzcGxheV92YWx1ZSA9IHZhbHVlO1xuXG5cdFx0aWYgKCB1bmRlZmluZWQgIT09IGRpc3BsYXkgKSB7XG5cdFx0XHRkaXNwbGF5X3ZhbHVlID0gZGlzcGxheTtcblx0XHR9XG5cblx0XHQkKCAnLnNsaWRlcicsIHBhcmVudF9zZWxlY3RvciApLnNsaWRlciggJ3ZhbHVlJywgcGFyc2VJbnQoIHZhbHVlICkgKTtcblx0XHQkKCAnLmFtb3VudCcsIHBhcmVudF9zZWxlY3RvciApLmh0bWwoIHdwbWRiX2FkZF9jb21tYXMoIGRpc3BsYXlfdmFsdWUgKSArICcgJyArIHVuaXQgKTtcblx0fVxuXG5cdGZ1bmN0aW9uIHNldF9wYXVzZV9yZXN1bWVfYnV0dG9uKCBldmVudCApIHtcblx0XHRpZiAoIHRydWUgPT09IG1pZ3JhdGlvbl9wYXVzZWQgKSB7XG5cdFx0XHRtaWdyYXRpb25fcGF1c2VkID0gZmFsc2U7XG5cdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHByZXZpb3VzX3Byb2dyZXNzX3RpdGxlLCBwcmV2aW91c19wcm9ncmVzc190ZXh0X3ByaW1hcnksICdhY3RpdmUnICk7XG5cdFx0XHQkKCAnLnBhdXNlLXJlc3VtZScgKS5odG1sKCB3cG1kYl9zdHJpbmdzLnBhdXNlICk7XG5cblx0XHRcdC8vIFJlc3VtZSB0aGUgdGltZXJcblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnJlc3VtZVRpbWVyKCk7XG5cblx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5leGVjdXRlX25leHRfc3RlcCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRtaWdyYXRpb25fcGF1c2VkID0gdHJ1ZTtcblx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdHByZXZpb3VzX3Byb2dyZXNzX3RpdGxlID0gJCggJy5wcm9ncmVzcy10aXRsZScgKS5odG1sKCk7XG5cdFx0XHRwcmV2aW91c19wcm9ncmVzc190ZXh0X3ByaW1hcnkgPSAkKCAnLnByb2dyZXNzLXRleHQnLCAnLnByb2dyZXNzLXdyYXBwZXItcHJpbWFyeScgKS5odG1sKCk7XG5cdFx0XHRwcmV2aW91c19wcm9ncmVzc190ZXh0X3NlY29uZGFyeSA9ICQoICcucHJvZ3Jlc3MtdGV4dCcsICcucHJvZ3Jlc3Mtd3JhcHBlci1zZWNvbmRhcnkgJyApLmh0bWwoKTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX3BhdXNlZCwgd3BtZGJfc3RyaW5ncy5jb21wbGV0aW5nX2N1cnJlbnRfcmVxdWVzdCwgbnVsbCApO1xuXHRcdFx0JCggJ2JvZHknICkub2ZmKCAnY2xpY2snLCAnLnBhdXNlLXJlc3VtZScgKTsgLy8gSXMgcmUtYm91bmQgYXQgZXhlY3V0ZV9uZXh0X3N0ZXAgd2hlbiBtaWdyYXRpb24gaXMgZmluYWxseSBwYXVzZWRcblx0XHRcdCQoICdib2R5JyApLm9mZiggJ2NsaWNrJywgJy5jYW5jZWwnICk7IC8vIElzIHJlLWJvdW5kIGF0IGV4ZWN1dGVfbmV4dF9zdGVwIHdoZW4gbWlncmF0aW9uIGlzIGZpbmFsbHkgcGF1c2VkXG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gY3JlYXRlX3RhYmxlX3NlbGVjdCggdGFibGVzLCB0YWJsZV9zaXplc19ociwgc2VsZWN0ZWRfdGFibGVzICkge1xuXHRcdHZhciAkdGFibGVfc2VsZWN0ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ3NlbGVjdCcgKTtcblx0XHQkKCAkdGFibGVfc2VsZWN0ICkuYXR0cigge1xuXHRcdFx0bXVsdGlwbGU6ICdtdWx0aXBsZScsXG5cdFx0XHRuYW1lOiAnc2VsZWN0X3RhYmxlc1tdJyxcblx0XHRcdGlkOiAnc2VsZWN0LXRhYmxlcycsXG5cdFx0XHRjbGFzczogJ211bHRpc2VsZWN0J1xuXHRcdH0gKTtcblxuXHRcdGlmICggMCA8IHRhYmxlcy5sZW5ndGggKSB7XG5cdFx0XHQkLmVhY2goIHRhYmxlcywgZnVuY3Rpb24oIGluZGV4LCB0YWJsZSApIHtcblx0XHRcdFx0aWYgKCAkLndwbWRiLmFwcGx5X2ZpbHRlcnMoICd3cG1kYl9leGNsdWRlX3RhYmxlJywgZmFsc2UsIHRhYmxlICkgKSB7XG5cdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHR9XG5cblx0XHRcdFx0dmFyIHNlbGVjdGVkID0gJyAnO1xuXHRcdFx0XHRpZiAoIHVuZGVmaW5lZCAhPT0gc2VsZWN0ZWRfdGFibGVzICYmIG51bGwgIT09IHNlbGVjdGVkX3RhYmxlcyAmJiAwIDwgc2VsZWN0ZWRfdGFibGVzLmxlbmd0aCAmJiAtMSAhPT0gJC5pbkFycmF5KCB0YWJsZSwgc2VsZWN0ZWRfdGFibGVzICkgKSB7XG5cdFx0XHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkPVwic2VsZWN0ZWRcIiAnO1xuXHRcdFx0XHR9XG5cdFx0XHRcdCQoICR0YWJsZV9zZWxlY3QgKS5hcHBlbmQoICc8b3B0aW9uJyArIHNlbGVjdGVkICsgJ3ZhbHVlPVwiJyArIHRhYmxlICsgJ1wiPicgKyB0YWJsZSArICcgKCcgKyB0YWJsZV9zaXplc19oclsgdGFibGUgXSArICcpPC9vcHRpb24+JyApO1xuXHRcdFx0fSApO1xuXHRcdH1cblxuXHRcdHJldHVybiAkdGFibGVfc2VsZWN0O1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybnMgdGFibGVzIHNlbGVjdGVkIGZvciBtaWdyYXRpb24uXG5cdCAqXG5cdCAqIEBwYXJhbSB2YWx1ZVxuXHQgKiBAcGFyYW0gYXJnc1xuXHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHQgKlxuXHQgKiBBbHNvIGhhbmRsZXIgZm9yIHdwbWRiX2dldF90YWJsZXNfdG9fbWlncmF0ZSBmaWx0ZXIsIGRpc3JlZ2FyZHMgaW5wdXQgdmFsdWVzIGFzIGl0IGlzIHRoZSBwcmltYXJ5IHNvdXJjZS5cblx0ICovXG5cdGZ1bmN0aW9uIGdldF90YWJsZXNfdG9fbWlncmF0ZSggdmFsdWUsIGFyZ3MgKSB7XG5cdFx0dmFyIHRhYmxlcyA9ICcnO1xuXHRcdHZhciBtaWdfdHlwZSA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cdFx0dmFyIHRhYmxlX2ludGVudCA9ICQoICdpbnB1dFtuYW1lPXRhYmxlX21pZ3JhdGVfb3B0aW9uXTpjaGVja2VkJyApLnZhbCgpO1xuXG5cdFx0Ly8gR3JhYiB0YWJsZXMgYXMgcGVyIHdoYXQgdGhlIHVzZXIgaGFzIHNlbGVjdGVkIGZyb20gdGhlIG11bHRpc2VsZWN0IGJveCBvciBhbGwgcHJlZml4ZWQgdGFibGVzLlxuXHRcdGlmICggJ21pZ3JhdGVfc2VsZWN0JyA9PT0gdGFibGVfaW50ZW50ICkge1xuXHRcdFx0dGFibGVzID0gJCggJyNzZWxlY3QtdGFibGVzJyApLnZhbCgpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHRpZiAoICdwdWxsJyAhPT0gbWlnX3R5cGUgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYl9kYXRhLnRoaXNfcHJlZml4ZWRfdGFibGVzICkge1xuXHRcdFx0XHR0YWJsZXMgPSB3cG1kYl9kYXRhLnRoaXNfcHJlZml4ZWRfdGFibGVzO1xuXHRcdFx0fVxuXHRcdFx0aWYgKCAncHVsbCcgPT09IG1pZ190eXBlICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucHJlZml4ZWRfdGFibGVzICkge1xuXHRcdFx0XHR0YWJsZXMgPSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnByZWZpeGVkX3RhYmxlcztcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdGFibGVzO1xuXHR9XG5cblx0ZnVuY3Rpb24gZ2V0X3RhYmxlX3ByZWZpeCggdmFsdWUsIGFyZ3MgKSB7XG5cdFx0cmV0dXJuICQoICcudGFibGUtc2VsZWN0LXdyYXAgLnRhYmxlLXByZWZpeCcgKS50ZXh0KCk7XG5cdH1cblxuXHRmdW5jdGlvbiBsb2NrX3JlcGxhY2VfdXJsKCBsb2NrICkge1xuXHRcdGlmICggdHJ1ZSA9PT0gbG9jayApIHtcblx0XHRcdCQoICcucmVwbGFjZS1yb3cucGluIC5yZXBsYWNlLXJpZ2h0LWNvbCBpbnB1dFt0eXBlPVwidGV4dFwiXScgKS5hdHRyKCAncmVhZG9ubHknLCAncmVhZG9ubHknICk7XG5cdFx0XHQkKCAnLnJlcGxhY2Utcm93LnBpbiAuYXJyb3ctY29sJyApLmFkZENsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0fSBlbHNlIHtcblx0XHRcdCQoICcucmVwbGFjZS1yb3cucGluIC5yZXBsYWNlLXJpZ2h0LWNvbCBpbnB1dFt0eXBlPVwidGV4dFwiXScgKS5yZW1vdmVBdHRyKCAncmVhZG9ubHknICk7XG5cdFx0XHQkKCAnLnJlcGxhY2Utcm93LnBpbiAuYXJyb3ctY29sJyApLnJlbW92ZUNsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0fVxuXHR9XG5cblx0ZnVuY3Rpb24gc2V0X2Nvbm5lY3Rpb25fZGF0YSggZGF0YSApIHtcblx0XHR3cG1kYi5jb21tb24ucHJldmlvdXNfY29ubmVjdGlvbl9kYXRhID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YTtcblx0XHR3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhID0gZGF0YTtcblx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX2Nvbm5lY3Rpb25fZGF0YV91cGRhdGVkJywgZGF0YSApO1xuXHR9XG5cblx0LyoqXG5cdCAqIFJldHVybnMgZm9ybWF0dGVkIGluZm8gZm9yIHRoZSBNYXggUmVxdWVzdCBTaXplIHNsaWRlci5cblx0ICpcblx0ICogQHBhcmFtIHZhbHVlXG5cdCAqIEByZXR1cm4gb2JqZWN0XG5cdCAqL1xuXHRmdW5jdGlvbiBnZXRfbWF4X3JlcXVlc3RfZGlzcGxheV9pbmZvKCB2YWx1ZSApIHtcblx0XHR2YXIgZGlzcGxheV9pbmZvID0ge307XG5cblx0XHRkaXNwbGF5X2luZm8udW5pdCA9ICdNQic7XG5cdFx0ZGlzcGxheV9pbmZvLmFtb3VudCA9ICggdmFsdWUgLyAxMDI0ICkudG9GaXhlZCggMiApO1xuXG5cdFx0cmV0dXJuIGRpc3BsYXlfaW5mbztcblx0fVxuXG5cdCQoIGRvY3VtZW50ICkucmVhZHkoIGZ1bmN0aW9uKCkge1xuXHRcdHdwbWRiLm1pZ3JhdGlvbl9zdGF0ZV9pZCA9ICcnO1xuXG5cdFx0JCggJyNwbHVnaW4tY29tcGF0aWJpbGl0eScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0dmFyIGluc3RhbGwgPSAnMSc7XG5cdFx0XHR2YXIgJHN0YXR1cyA9ICQoIHRoaXMgKS5jbG9zZXN0KCAndGQnICkubmV4dCggJ3RkJyApLmZpbmQoICcuc2V0dGluZy1zdGF0dXMnICk7XG5cblx0XHRcdGlmICggJCggdGhpcyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdHZhciBhbnN3ZXIgPSBjb25maXJtKCB3cG1kYl9zdHJpbmdzLm11X3BsdWdpbl9jb25maXJtYXRpb24gKTtcblxuXHRcdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdFx0JCggdGhpcyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH1cblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGluc3RhbGwgPSAnMCc7XG5cdFx0XHR9XG5cblx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktd3JhcCcgKS50b2dnbGUoKTtcblxuXHRcdFx0JHN0YXR1cy5maW5kKCAnLmFqYXgtc3VjY2Vzcy1tc2cnICkucmVtb3ZlKCk7XG5cdFx0XHQkc3RhdHVzLmFwcGVuZCggYWpheF9zcGlubmVyICk7XG5cdFx0XHQkKCAnI3BsdWdpbi1jb21wYXRpYmlsaXR5JyApLmF0dHIoICdkaXNhYmxlZCcsICdkaXNhYmxlZCcgKTtcblx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHknICkuYWRkQ2xhc3MoICdkaXNhYmxlZCcgKTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9wbHVnaW5fY29tcGF0aWJpbGl0eScsXG5cdFx0XHRcdFx0aW5zdGFsbDogaW5zdGFsbFxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbHVnaW5fY29tcGF0aWJpbGl0eV9zZXR0aW5nc19wcm9ibGVtICsgJ1xcclxcblxcclxcbicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICcgJyArIGpxWEhSLnN0YXR1cyArICcgJyArIGpxWEhSLnN0YXR1c1RleHQgKyAnXFxyXFxuXFxyXFxuJyArIHdwbWRiX3N0cmluZ3MucmVzcG9uc2UgKyAnXFxyXFxuJyArIGpxWEhSLnJlc3BvbnNlVGV4dCApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcjcGx1Z2luLWNvbXBhdGliaWxpdHknICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHknICkucmVtb3ZlQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gJC50cmltKCBkYXRhICkgKSB7XG5cdFx0XHRcdFx0XHRhbGVydCggZGF0YSApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkc3RhdHVzLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwiYWpheC1zdWNjZXNzLW1zZ1wiPicgKyB3cG1kYl9zdHJpbmdzLnNhdmVkICsgJzwvc3Bhbj4nICk7XG5cdFx0XHRcdFx0XHQkKCAnLmFqYXgtc3VjY2Vzcy1tc2cnICkuZmFkZU91dCggMjAwMCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JCggJyNwbHVnaW4tY29tcGF0aWJpbGl0eScgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5wbHVnaW4tY29tcGF0aWJpbGl0eScgKS5yZW1vdmVDbGFzcyggJ2Rpc2FibGVkJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHRpZiAoICQoICcjcGx1Z2luLWNvbXBhdGliaWxpdHknICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktd3JhcCcgKS5zaG93KCk7XG5cdFx0fVxuXG5cdFx0aWYgKCAwIDw9IG5hdmlnYXRvci51c2VyQWdlbnQuaW5kZXhPZiggJ01TSUUnICkgfHwgMCA8PSBuYXZpZ2F0b3IudXNlckFnZW50LmluZGV4T2YoICdUcmlkZW50JyApICkge1xuXHRcdFx0JCggJy5pZS13YXJuaW5nJyApLnNob3coKTtcblx0XHR9XG5cblx0XHRpZiAoIDAgPT09IHdwbWRiX2RhdGEudmFsaWRfbGljZW5jZSApIHtcblx0XHRcdCQoICcjc2F2ZWZpbGUnICkucHJvcCggJ2NoZWNrZWQnLCB0cnVlICk7XG5cdFx0fVxuXHRcdHZhciBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciA9ICQoICcubWF4LXJlcXVlc3Qtc2l6ZScgKTtcblx0XHR2YXIgbWF4X3JlcXVlc3Rfc2l6ZV9zbGlkZXIgPSAkKCAnLnNsaWRlcicsIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyICk7XG5cdFx0bWF4X3JlcXVlc3Rfc2l6ZV9zbGlkZXIuc2xpZGVyKCB7XG5cdFx0XHRyYW5nZTogJ21pbicsXG5cdFx0XHR2YWx1ZTogcGFyc2VJbnQoIHdwbWRiX2RhdGEubWF4X3JlcXVlc3QgLyAxMDI0ICksXG5cdFx0XHRtaW46IDUxMixcblx0XHRcdG1heDogcGFyc2VJbnQoIHdwbWRiX2RhdGEuYm90dGxlbmVjayAvIDEwMjQgKSxcblx0XHRcdHN0ZXA6IDI1Nixcblx0XHRcdGNyZWF0ZTogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0dmFyIGRpc3BsYXlfaW5mbyA9IGdldF9tYXhfcmVxdWVzdF9kaXNwbGF5X2luZm8oIHdwbWRiX2RhdGEubWF4X3JlcXVlc3QgLyAxMDI0ICk7XG5cdFx0XHRcdHNldF9zbGlkZXJfdmFsdWUoIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyLCB3cG1kYl9kYXRhLm1heF9yZXF1ZXN0IC8gMTAyNCwgZGlzcGxheV9pbmZvLnVuaXQsIGRpc3BsYXlfaW5mby5hbW91bnQgKTtcblx0XHRcdH0sXG5cdFx0XHRzbGlkZTogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0dmFyIGRpc3BsYXlfaW5mbyA9IGdldF9tYXhfcmVxdWVzdF9kaXNwbGF5X2luZm8oIHVpLnZhbHVlICk7XG5cdFx0XHRcdHNldF9zbGlkZXJfdmFsdWUoIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyLCB1aS52YWx1ZSwgZGlzcGxheV9pbmZvLnVuaXQsIGRpc3BsYXlfaW5mby5hbW91bnQgKTtcblx0XHRcdH0sXG5cdFx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuXHRcdFx0XHQkKCAnLnNsaWRlci1zdWNjZXNzLW1zZycgKS5yZW1vdmUoKTtcblx0XHRcdFx0JCggJy5hbW91bnQnLCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciApLmFmdGVyKCAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJzbGlkZXItc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPicgKTtcblx0XHRcdFx0bWF4X3JlcXVlc3Rfc2l6ZV9zbGlkZXIuc2xpZGVyKCAnZGlzYWJsZScgKTtcblxuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl91cGRhdGVfbWF4X3JlcXVlc3Rfc2l6ZScsXG5cdFx0XHRcdFx0XHRtYXhfcmVxdWVzdF9zaXplOiBwYXJzZUludCggdWkudmFsdWUgKSxcblx0XHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy51cGRhdGVfbWF4X3JlcXVlc3Rfc2l6ZVxuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0XHRtYXhfcmVxdWVzdF9zaXplX3NsaWRlci5zbGlkZXIoICdlbmFibGUnICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNsaWRlci1zcGlubmVyJywgbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLm1heF9yZXF1ZXN0X3NpemVfcHJvYmxlbSApO1xuXHRcdFx0XHRcdFx0dmFyIGRpc3BsYXlfaW5mbyA9IGdldF9tYXhfcmVxdWVzdF9kaXNwbGF5X2luZm8oIHdwbWRiX2RhdGEubWF4X3JlcXVlc3QgLyAxMDI0ICk7XG5cdFx0XHRcdFx0XHRzZXRfc2xpZGVyX3ZhbHVlKCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciwgd3BtZGJfZGF0YS5tYXhfcmVxdWVzdCAvIDEwMjQsIGRpc3BsYXlfaW5mby51bml0LCBkaXNwbGF5X2luZm8uYW1vdW50ICk7XG5cdFx0XHRcdFx0XHRtYXhfcmVxdWVzdF9zaXplX3NsaWRlci5zbGlkZXIoICdlbmFibGUnICk7XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdG1heF9yZXF1ZXN0X3NpemVfc2xpZGVyLnNsaWRlciggJ2VuYWJsZScgKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLWxhYmVsLXdyYXBwZXInLCBtYXhfcmVxdWVzdF9zaXplX2NvbnRhaW5lciApLmFwcGVuZCggJzxzcGFuIGNsYXNzPVwic2xpZGVyLXN1Y2Nlc3MtbXNnXCI+JyArIHdwbWRiX3N0cmluZ3Muc2F2ZWQgKyAnPC9zcGFuPicgKTtcblx0XHRcdFx0XHRcdCQoICcuc2xpZGVyLXN1Y2Nlc3MtbXNnJywgbWF4X3JlcXVlc3Rfc2l6ZV9jb250YWluZXIgKS5mYWRlT3V0KCAyMDAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItc3Bpbm5lcicsIG1heF9yZXF1ZXN0X3NpemVfY29udGFpbmVyICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0dmFyIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyID0gJCggJy5kZWxheS1iZXR3ZWVuLXJlcXVlc3RzJyApO1xuXHRcdHZhciBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX3NsaWRlciA9ICQoICcuc2xpZGVyJywgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19jb250YWluZXIgKTtcblx0XHRkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX3NsaWRlci5zbGlkZXIoIHtcblx0XHRcdHJhbmdlOiAnbWluJyxcblx0XHRcdHZhbHVlOiBwYXJzZUludCggd3BtZGJfZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzIC8gMTAwMCApLFxuXHRcdFx0bWluOiAwLFxuXHRcdFx0bWF4OiAxMCxcblx0XHRcdHN0ZXA6IDEsXG5cdFx0XHRjcmVhdGU6IGZ1bmN0aW9uKCBldmVudCwgdWkgKSB7XG5cdFx0XHRcdHNldF9zbGlkZXJfdmFsdWUoIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyLCB3cG1kYl9kYXRhLmRlbGF5X2JldHdlZW5fcmVxdWVzdHMgLyAxMDAwLCAncycgKTtcblx0XHRcdH0sXG5cdFx0XHRzbGlkZTogZnVuY3Rpb24oIGV2ZW50LCB1aSApIHtcblx0XHRcdFx0c2V0X3NsaWRlcl92YWx1ZSggZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19jb250YWluZXIsIHVpLnZhbHVlLCAncycgKTtcblx0XHRcdH0sXG5cdFx0XHRzdG9wOiBmdW5jdGlvbiggZXZlbnQsIHVpICkge1xuXHRcdFx0XHQkKCAnLnNsaWRlci1zdWNjZXNzLW1zZycgKS5yZW1vdmUoKTtcblx0XHRcdFx0JCggJy5hbW91bnQnLCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciApLmFmdGVyKCAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJzbGlkZXItc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPicgKTtcblx0XHRcdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19zbGlkZXIuc2xpZGVyKCAnZGlzYWJsZScgKTtcblxuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl91cGRhdGVfZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cycsXG5cdFx0XHRcdFx0XHRkZWxheV9iZXR3ZWVuX3JlcXVlc3RzOiBwYXJzZUludCggdWkudmFsdWUgKiAxMDAwICksXG5cdFx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMudXBkYXRlX2RlbGF5X2JldHdlZW5fcmVxdWVzdHNcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19zbGlkZXIuc2xpZGVyKCAnZW5hYmxlJyApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItc3Bpbm5lcicsIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzX3Byb2JsZW0gKTtcblx0XHRcdFx0XHRcdHNldF9zbGlkZXJfdmFsdWUoIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyLCB3cG1kYl9kYXRhLmRlbGF5X2JldHdlZW5fcmVxdWVzdHMgLyAxMDAwLCAncycgKTtcblx0XHRcdFx0XHRcdGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfc2xpZGVyLnNsaWRlciggJ2VuYWJsZScgKTtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0d3BtZGJfZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzID0gcGFyc2VJbnQoIHVpLnZhbHVlICogMTAwMCApO1xuXHRcdFx0XHRcdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19zbGlkZXIuc2xpZGVyKCAnZW5hYmxlJyApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItbGFiZWwtd3JhcHBlcicsIGRlbGF5X2JldHdlZW5fcmVxdWVzdHNfY29udGFpbmVyICkuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJzbGlkZXItc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdFx0JCggJy5zbGlkZXItc3VjY2Vzcy1tc2cnLCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzX2NvbnRhaW5lciApLmZhZGVPdXQoIDIwMDAsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnNsaWRlci1zcGlubmVyJywgZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0c19jb250YWluZXIgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHR2YXIgJHB1c2hfc2VsZWN0ID0gJCggJyNzZWxlY3QtdGFibGVzJyApLmNsb25lKCk7XG5cdFx0dmFyICRwdWxsX3NlbGVjdCA9ICQoICcjc2VsZWN0LXRhYmxlcycgKS5jbG9uZSgpO1xuXHRcdHZhciAkcHVzaF9wb3N0X3R5cGVfc2VsZWN0ID0gJCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS5jbG9uZSgpO1xuXHRcdHZhciAkcHVsbF9wb3N0X3R5cGVfc2VsZWN0ID0gJCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS5jbG9uZSgpO1xuXHRcdHZhciAkcHVzaF9zZWxlY3RfYmFja3VwID0gJCggJyNzZWxlY3QtYmFja3VwJyApLmNsb25lKCk7XG5cdFx0dmFyICRwdWxsX3NlbGVjdF9iYWNrdXAgPSAkKCAnI3NlbGVjdC1iYWNrdXAnICkuY2xvbmUoKTtcblxuXHRcdCQoICcuaGVscC10YWIgLnZpZGVvJyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyICRjb250YWluZXIgPSAkKCB0aGlzICksXG5cdFx0XHRcdCR2aWV3ZXIgPSAkKCAnLnZpZGVvLXZpZXdlcicgKTtcblxuXHRcdFx0JCggJ2EnLCB0aGlzICkuY2xpY2soIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdFx0JHZpZXdlci5hdHRyKCAnc3JjJywgJy8vd3d3LnlvdXR1YmUuY29tL2VtYmVkLycgKyAkY29udGFpbmVyLmRhdGEoICd2aWRlby1pZCcgKSArICc/YXV0b3BsYXk9MScgKTtcblx0XHRcdFx0JHZpZXdlci5zaG93KCk7XG5cdFx0XHRcdHZhciBvZmZzZXQgPSAkdmlld2VyLm9mZnNldCgpO1xuXHRcdFx0XHQkKCB3aW5kb3cgKS5zY3JvbGxUb3AoIG9mZnNldC50b3AgLSA1MCApO1xuXHRcdFx0fSApO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuYmFja3VwLW9wdGlvbnMnICkuc2hvdygpO1xuXHRcdCQoICcua2VlcC1hY3RpdmUtcGx1Z2lucycgKS5zaG93KCk7XG5cdFx0aWYgKCAnc2F2ZWZpbGUnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0JCggJy5iYWNrdXAtb3B0aW9ucycgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLmtlZXAtYWN0aXZlLXBsdWdpbnMnICkuaGlkZSgpO1xuXHRcdH1cblxuXHRcdGxhc3RfcmVwbGFjZV9zd2l0Y2ggPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXG5cdFx0ZnVuY3Rpb24gY2hlY2tfbGljZW5jZSggbGljZW5jZSApIHtcblx0XHRcdGNoZWNrZWRfbGljZW5jZSA9IHRydWU7XG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2NoZWNrX2xpY2VuY2UnLFxuXHRcdFx0XHRcdGxpY2VuY2U6IGxpY2VuY2UsXG5cdFx0XHRcdFx0Y29udGV4dDogJ2FsbCcsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmNoZWNrX2xpY2VuY2Vcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MubGljZW5zZV9jaGVja19wcm9ibGVtICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXG5cdFx0XHRcdFx0dmFyICRzdXBwb3J0X2NvbnRlbnQgPSAkKCAnLnN1cHBvcnQtY29udGVudCcgKTtcblx0XHRcdFx0XHR2YXIgJGFkZG9uc19jb250ZW50ID0gJCggJy5hZGRvbnMtY29udGVudCcgKTtcblx0XHRcdFx0XHR2YXIgJGxpY2VuY2VfY29udGVudCA9ICQoICcubGljZW5jZS1zdGF0dXM6bm90KC5ub3RpZmljYXRpb24tbWVzc2FnZSknICk7XG5cdFx0XHRcdFx0dmFyIGxpY2VuY2VfbXNnLCBzdXBwb3J0X21zZywgYWRkb25zX21zZztcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmRicmFpbnNfYXBpX2Rvd24gKSB7XG5cdFx0XHRcdFx0XHRzdXBwb3J0X21zZyA9IGRhdGEuZGJyYWluc19hcGlfZG93biArIGRhdGEubWVzc2FnZTtcblx0XHRcdFx0XHRcdGFkZG9uc19tc2cgPSBkYXRhLmRicmFpbnNfYXBpX2Rvd247XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmVycm9ycyApIHtcblxuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEuZXJyb3JzLnN1YnNjcmlwdGlvbl9leHBpcmVkICkge1xuXHRcdFx0XHRcdFx0XHRsaWNlbmNlX21zZyA9IGRhdGEuZXJyb3JzLnN1YnNjcmlwdGlvbl9leHBpcmVkLmxpY2VuY2U7XG5cdFx0XHRcdFx0XHRcdHN1cHBvcnRfbXNnID0gZGF0YS5lcnJvcnMuc3Vic2NyaXB0aW9uX2V4cGlyZWQuc3VwcG9ydDtcblx0XHRcdFx0XHRcdFx0YWRkb25zX21zZyA9IGRhdGEuZXJyb3JzLnN1YnNjcmlwdGlvbl9leHBpcmVkLmFkZG9ucztcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHZhciBtc2cgPSAnJztcblx0XHRcdFx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBkYXRhLmVycm9ycyApIHtcblx0XHRcdFx0XHRcdFx0XHRtc2cgKz0gZGF0YS5lcnJvcnNbIGtleSBdO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdHN1cHBvcnRfbXNnID0gbXNnO1xuXHRcdFx0XHRcdFx0XHRhZGRvbnNfbXNnID0gbXNnO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEuYWRkb25fY29udGVudCApIHtcblx0XHRcdFx0XHRcdFx0YWRkb25zX21zZyArPSAnXFxuJyArIGRhdGEuYWRkb25fY29udGVudDtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0c3VwcG9ydF9tc2cgPSBkYXRhLm1lc3NhZ2U7XG5cdFx0XHRcdFx0XHRhZGRvbnNfbXNnID0gZGF0YS5hZGRvbl9jb250ZW50O1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdCRsaWNlbmNlX2NvbnRlbnQuc3RvcCgpLmZhZGVPdXQoIGZhZGVfZHVyYXRpb24sIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JCggdGhpcyApXG5cdFx0XHRcdFx0XHRcdC5jc3MoIHsgdmlzaWJpbGl0eTogJ2hpZGRlbicsIGRpc3BsYXk6ICdibG9jaycgfSApLnNsaWRlVXAoKVxuXHRcdFx0XHRcdFx0XHQuZW1wdHkoKVxuXHRcdFx0XHRcdFx0XHQuaHRtbCggbGljZW5jZV9tc2cgKVxuXHRcdFx0XHRcdFx0XHQuc3RvcCgpXG5cdFx0XHRcdFx0XHRcdC5mYWRlSW4oIGZhZGVfZHVyYXRpb24gKTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0JHN1cHBvcnRfY29udGVudC5zdG9wKCkuZmFkZU91dCggZmFkZV9kdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKCB0aGlzIClcblx0XHRcdFx0XHRcdFx0LmVtcHR5KClcblx0XHRcdFx0XHRcdFx0Lmh0bWwoIHN1cHBvcnRfbXNnIClcblx0XHRcdFx0XHRcdFx0LnN0b3AoKVxuXHRcdFx0XHRcdFx0XHQuZmFkZUluKCBmYWRlX2R1cmF0aW9uICk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdCRhZGRvbnNfY29udGVudC5zdG9wKCkuZmFkZU91dCggZmFkZV9kdXJhdGlvbiwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKCB0aGlzIClcblx0XHRcdFx0XHRcdFx0LmVtcHR5KClcblx0XHRcdFx0XHRcdFx0Lmh0bWwoIGFkZG9uc19tc2cgKVxuXHRcdFx0XHRcdFx0XHQuc3RvcCgpXG5cdFx0XHRcdFx0XHRcdC5mYWRlSW4oIGZhZGVfZHVyYXRpb24gKTtcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH1cblxuXHRcdC8qKlxuXHRcdCAqIEhhbmRsZSAnQ2hlY2sgTGljZW5zZSBBZ2FpbicgZnVuY3Rpb25hbGl0eSBmb3VuZCBpbiBleHBpcmVkIGxpY2Vuc2UgbWVzc2FnZXMuXG5cdFx0ICovXG5cdFx0JCggJy5jb250ZW50LXRhYicgKS5vbiggJ2NsaWNrJywgJy5jaGVjay1teS1saWNlbmNlLWFnYWluJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRjaGVja2VkX2xpY2VuY2UgPSBmYWxzZTtcblx0XHRcdCQoIGUudGFyZ2V0ICkucmVwbGFjZVdpdGgoICdDaGVja2luZy4uLiAnICsgYWpheF9zcGlubmVyICk7XG5cdFx0XHRjaGVja19saWNlbmNlKCBudWxsLCAnYWxsJyApO1xuXHRcdH0gKTtcblx0XHRmdW5jdGlvbiByZWZyZXNoX3RhYmxlX3NlbGVjdHMoKSB7XG5cdFx0XHRpZiAoIHVuZGVmaW5lZCAhPT0gd3BtZGJfZGF0YSAmJiB1bmRlZmluZWQgIT09IHdwbWRiX2RhdGEudGhpc190YWJsZXMgJiYgdW5kZWZpbmVkICE9PSB3cG1kYl9kYXRhLnRoaXNfdGFibGVfc2l6ZXNfaHIgKSB7XG5cdFx0XHRcdCRwdXNoX3NlbGVjdCA9IGNyZWF0ZV90YWJsZV9zZWxlY3QoIHdwbWRiX2RhdGEudGhpc190YWJsZXMsIHdwbWRiX2RhdGEudGhpc190YWJsZV9zaXplc19ociwgJCggJHB1c2hfc2VsZWN0ICkudmFsKCkgKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCB1bmRlZmluZWQgIT09IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgJiYgdW5kZWZpbmVkICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlcyAmJiB1bmRlZmluZWQgIT09IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVfc2l6ZXNfaHIgKSB7XG5cdFx0XHRcdCRwdWxsX3NlbGVjdCA9IGNyZWF0ZV90YWJsZV9zZWxlY3QoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVzLCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlX3NpemVzX2hyLCAkKCAkcHVsbF9zZWxlY3QgKS52YWwoKSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdCQud3BtZGIuYWRkX2FjdGlvbiggJ3dwbWRiX3JlZnJlc2hfdGFibGVfc2VsZWN0cycsIHJlZnJlc2hfdGFibGVfc2VsZWN0cyApO1xuXG5cdFx0ZnVuY3Rpb24gdXBkYXRlX3B1c2hfdGFibGVfc2VsZWN0KCkge1xuXHRcdFx0JCggJyNzZWxlY3QtdGFibGVzJyApLnJlbW92ZSgpO1xuXHRcdFx0JCggJy5zZWxlY3QtdGFibGVzLXdyYXAnICkucHJlcGVuZCggJHB1c2hfc2VsZWN0ICk7XG5cdFx0XHQkKCAnI3NlbGVjdC10YWJsZXMnICkuY2hhbmdlKCk7XG5cdFx0fVxuXG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfdXBkYXRlX3B1c2hfdGFibGVfc2VsZWN0JywgdXBkYXRlX3B1c2hfdGFibGVfc2VsZWN0ICk7XG5cblx0XHRmdW5jdGlvbiB1cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QoKSB7XG5cdFx0XHQkKCAnI3NlbGVjdC10YWJsZXMnICkucmVtb3ZlKCk7XG5cdFx0XHQkKCAnLnNlbGVjdC10YWJsZXMtd3JhcCcgKS5wcmVwZW5kKCAkcHVsbF9zZWxlY3QgKTtcblx0XHRcdCQoICcjc2VsZWN0LXRhYmxlcycgKS5jaGFuZ2UoKTtcblx0XHR9XG5cblx0XHQkLndwbWRiLmFkZF9hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QnLCB1cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QgKTtcblxuXHRcdGZ1bmN0aW9uIGRpc2FibGVfdGFibGVfbWlncmF0aW9uX29wdGlvbnMoKSB7XG5cdFx0XHQkKCAnI21pZ3JhdGUtc2VsZWN0ZWQnICkucGFyZW50cyggJy5vcHRpb24tc2VjdGlvbicgKS5jaGlsZHJlbiggJy5oZWFkZXItZXhwYW5kLWNvbGxhcHNlJyApLmNoaWxkcmVuKCAnLmV4cGFuZC1jb2xsYXBzZS1hcnJvdycgKS5yZW1vdmVDbGFzcyggJ2NvbGxhcHNlZCcgKTtcblx0XHRcdCQoICcudGFibGUtc2VsZWN0LXdyYXAnICkuc2hvdygpO1xuXHRcdFx0JCggJyNtaWdyYXRlLW9ubHktd2l0aC1wcmVmaXgnICkucHJvcCggJ2NoZWNrZWQnLCBmYWxzZSApO1xuXHRcdFx0JCggJyNtaWdyYXRlLXNlbGVjdGVkJyApLnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXHRcdFx0JCggJy50YWJsZS1taWdyYXRlLW9wdGlvbnMnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5zZWxlY3QtdGFibGVzLXdyYXAnICkuc2hvdygpO1xuXHRcdH1cblxuXHRcdCQud3BtZGIuYWRkX2FjdGlvbiggJ3dwbWRiX2Rpc2FibGVfdGFibGVfbWlncmF0aW9uX29wdGlvbnMnLCBkaXNhYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zICk7XG5cblx0XHRmdW5jdGlvbiBlbmFibGVfdGFibGVfbWlncmF0aW9uX29wdGlvbnMoKSB7XG5cdFx0XHQkKCAnLnRhYmxlLW1pZ3JhdGUtb3B0aW9ucycgKS5zaG93KCk7XG5cdFx0fVxuXG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfZW5hYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zJywgZW5hYmxlX3RhYmxlX21pZ3JhdGlvbl9vcHRpb25zICk7XG5cblx0XHRmdW5jdGlvbiBzZWxlY3RfYWxsX3RhYmxlcygpIHtcblx0XHRcdCQoICcjc2VsZWN0LXRhYmxlcycgKS5jaGlsZHJlbiggJ29wdGlvbicgKS5wcm9wKCAnc2VsZWN0ZWQnLCB0cnVlICk7XG5cdFx0XHQkKCAnI3NlbGVjdC10YWJsZXMnICkuY2hhbmdlKCk7XG5cdFx0fVxuXG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfc2VsZWN0X2FsbF90YWJsZXMnLCBzZWxlY3RfYWxsX3RhYmxlcyApO1xuXG5cdFx0ZnVuY3Rpb24gYmFzZV9vbGRfdXJsKCB2YWx1ZSwgYXJncyApIHtcblx0XHRcdHJldHVybiByZW1vdmVfcHJvdG9jb2woIHdwbWRiX2RhdGEudGhpc191cmwgKTtcblx0XHR9XG5cblx0XHQkLndwbWRiLmFkZF9maWx0ZXIoICd3cG1kYl9iYXNlX29sZF91cmwnLCBiYXNlX29sZF91cmwgKTtcblxuXHRcdGZ1bmN0aW9uIGVzdGFibGlzaF9yZW1vdGVfY29ubmVjdGlvbl9mcm9tX3NhdmVkX3Byb2ZpbGUoKSB7XG5cdFx0XHR2YXIgYWN0aW9uID0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKTtcblx0XHRcdHZhciBjb25uZWN0aW9uX2luZm8gPSAkLnRyaW0oICQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoKSApLnNwbGl0KCAnXFxuJyApO1xuXHRcdFx0aWYgKCAndW5kZWZpbmVkJyA9PT0gdHlwZW9mIHdwbWRiX2RlZmF1bHRfcHJvZmlsZSB8fCB0cnVlID09PSB3cG1kYl9kZWZhdWx0X3Byb2ZpbGUgfHwgJ3NhdmVmaWxlJyA9PT0gYWN0aW9uIHx8IGRvaW5nX2FqYXggfHwgIXdwbWRiX2RhdGEuaXNfcHJvICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXHRcdFx0ZGlzYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MuZXN0YWJsaXNoaW5nX3JlbW90ZV9jb25uZWN0aW9uICk7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLnJlbW92ZUNsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYXBwZW5kKCBhamF4X3NwaW5uZXIgKTtcblxuXHRcdFx0dmFyIGludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfdmVyaWZ5X2Nvbm5lY3Rpb25fdG9fcmVtb3RlX3NpdGUnLFxuXHRcdFx0XHRcdHVybDogY29ubmVjdGlvbl9pbmZvWyAwIF0sXG5cdFx0XHRcdFx0a2V5OiBjb25uZWN0aW9uX2luZm9bIDEgXSxcblx0XHRcdFx0XHRpbnRlbnQ6IGludGVudCxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMudmVyaWZ5X2Nvbm5lY3Rpb25fdG9fcmVtb3RlX3NpdGUsXG5cdFx0XHRcdFx0Y29udmVydF9wb3N0X3R5cGVfc2VsZWN0aW9uOiB3cG1kYl9jb252ZXJ0X3Bvc3RfdHlwZV9zZWxlY3Rpb24sXG5cdFx0XHRcdFx0cHJvZmlsZTogd3BtZGJfZGF0YS5wcm9maWxlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggZ2V0X2FqYXhfZXJyb3JzKCBqcVhIUi5yZXNwb25zZVRleHQsICcoIzEwMiknLCBqcVhIUiApICk7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5hZGRDbGFzcyggJ25vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZSBtaWdyYXRpb24tZXJyb3InICk7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXHRcdFx0XHR9LFxuXHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0ZW5hYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCk7XG5cblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS53cG1kYl9lcnJvciAmJiAxID09PSBkYXRhLndwbWRiX2Vycm9yICkge1xuXHRcdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5odG1sKCBkYXRhLmJvZHkgKTtcblx0XHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRpZiAoIGRhdGEuYm9keS5pbmRleE9mKCAnNDAxIFVuYXV0aG9yaXplZCcgKSA+IC0xICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLmJhc2ljLWFjY2Vzcy1hdXRoLXdyYXBwZXInICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0bWF5YmVfc2hvd19zc2xfd2FybmluZyggY29ubmVjdGlvbl9pbmZvWyAwIF0sIGNvbm5lY3Rpb25faW5mb1sgMSBdLCBkYXRhLnNjaGVtZSApO1xuXHRcdFx0XHRcdG1heWJlX3Nob3dfcHJlZml4X25vdGljZSggZGF0YS5wcmVmaXggKTtcblxuXHRcdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5hZGRDbGFzcyggJ3RlbXAtZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5wdWxsLXB1c2gtY29ubmVjdGlvbi1pbmZvJyApLmF0dHIoICdyZWFkb25seScsICdyZWFkb25seScgKTtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3QtYnV0dG9uJyApLmhpZGUoKTtcblxuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaGlkZSgpO1xuXHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuc2hvdygpO1xuXHRcdFx0XHRcdGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNldF9jb25uZWN0aW9uX2RhdGEoIGRhdGEgKTtcblx0XHRcdFx0XHRtb3ZlX2Nvbm5lY3Rpb25faW5mb19ib3goKTtcblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCk7XG5cblx0XHRcdFx0XHR2YXIgbG9hZGVkX3RhYmxlcyA9ICcnO1xuXHRcdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiX2RlZmF1bHRfcHJvZmlsZSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiX2xvYWRlZF90YWJsZXMgKSB7XG5cdFx0XHRcdFx0XHRsb2FkZWRfdGFibGVzID0gd3BtZGJfbG9hZGVkX3RhYmxlcztcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkcHVsbF9zZWxlY3QgPSBjcmVhdGVfdGFibGVfc2VsZWN0KCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlcywgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZV9zaXplc19ociwgbG9hZGVkX3RhYmxlcyApO1xuXG5cdFx0XHRcdFx0dmFyIGxvYWRlZF9wb3N0X3R5cGVzID0gJyc7XG5cdFx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGJfZGVmYXVsdF9wcm9maWxlICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGJfbG9hZGVkX3Bvc3RfdHlwZXMgKSB7XG5cdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS5zZWxlY3RfcG9zdF90eXBlcyApIHtcblx0XHRcdFx0XHRcdFx0JCggJyNleGNsdWRlLXBvc3QtdHlwZXMnICkuYXR0ciggJ2NoZWNrZWQnLCAnY2hlY2tlZCcgKTtcblx0XHRcdFx0XHRcdFx0JCggJy5wb3N0LXR5cGUtc2VsZWN0LXdyYXAnICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0XHRsb2FkZWRfcG9zdF90eXBlcyA9IGRhdGEuc2VsZWN0X3Bvc3RfdHlwZXM7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRsb2FkZWRfcG9zdF90eXBlcyA9IHdwbWRiX2xvYWRlZF9wb3N0X3R5cGVzO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHZhciAkcG9zdF90eXBlX3NlbGVjdCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoICdzZWxlY3QnICk7XG5cdFx0XHRcdFx0JCggJHBvc3RfdHlwZV9zZWxlY3QgKS5hdHRyKCB7XG5cdFx0XHRcdFx0XHRtdWx0aXBsZTogJ211bHRpcGxlJyxcblx0XHRcdFx0XHRcdG5hbWU6ICdzZWxlY3RfcG9zdF90eXBlc1tdJyxcblx0XHRcdFx0XHRcdGlkOiAnc2VsZWN0LXBvc3QtdHlwZXMnLFxuXHRcdFx0XHRcdFx0Y2xhc3M6ICdtdWx0aXNlbGVjdCdcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkLmVhY2goIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucG9zdF90eXBlcywgZnVuY3Rpb24oIGluZGV4LCB2YWx1ZSApIHtcblx0XHRcdFx0XHRcdHZhciBzZWxlY3RlZCA9ICQuaW5BcnJheSggdmFsdWUsIGxvYWRlZF9wb3N0X3R5cGVzICk7XG5cdFx0XHRcdFx0XHRpZiAoIC0xICE9PSBzZWxlY3RlZCB8fCAoIHRydWUgPT09IHdwbWRiX2NvbnZlcnRfZXhjbHVkZV9yZXZpc2lvbnMgJiYgJ3JldmlzaW9uJyAhPT0gdmFsdWUgKSApIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQgPSAnIHNlbGVjdGVkPVwic2VsZWN0ZWRcIiAnO1xuXHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0c2VsZWN0ZWQgPSAnICc7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkKCAkcG9zdF90eXBlX3NlbGVjdCApLmFwcGVuZCggJzxvcHRpb24nICsgc2VsZWN0ZWQgKyAndmFsdWU9XCInICsgdmFsdWUgKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPicgKTtcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkcHVsbF9wb3N0X3R5cGVfc2VsZWN0ID0gJHBvc3RfdHlwZV9zZWxlY3Q7XG5cblx0XHRcdFx0XHR2YXIgbG9hZGVkX3RhYmxlc19iYWNrdXAgPSAnJztcblx0XHRcdFx0XHRpZiAoIGZhbHNlID09PSB3cG1kYl9kZWZhdWx0X3Byb2ZpbGUgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYl9sb2FkZWRfdGFibGVzX2JhY2t1cCApIHtcblx0XHRcdFx0XHRcdGxvYWRlZF90YWJsZXNfYmFja3VwID0gd3BtZGJfbG9hZGVkX3RhYmxlc19iYWNrdXA7XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0dmFyICR0YWJsZV9zZWxlY3RfYmFja3VwID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCggJ3NlbGVjdCcgKTtcblx0XHRcdFx0XHQkKCAkdGFibGVfc2VsZWN0X2JhY2t1cCApLmF0dHIoIHtcblx0XHRcdFx0XHRcdG11bHRpcGxlOiAnbXVsdGlwbGUnLFxuXHRcdFx0XHRcdFx0bmFtZTogJ3NlbGVjdF9iYWNrdXBbXScsXG5cdFx0XHRcdFx0XHRpZDogJ3NlbGVjdC1iYWNrdXAnLFxuXHRcdFx0XHRcdFx0Y2xhc3M6ICdtdWx0aXNlbGVjdCdcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkLmVhY2goIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudGFibGVzLCBmdW5jdGlvbiggaW5kZXgsIHZhbHVlICkge1xuXHRcdFx0XHRcdFx0dmFyIHNlbGVjdGVkID0gJC5pbkFycmF5KCB2YWx1ZSwgbG9hZGVkX3RhYmxlc19iYWNrdXAgKTtcblx0XHRcdFx0XHRcdGlmICggLTEgIT09IHNlbGVjdGVkICkge1xuXHRcdFx0XHRcdFx0XHRzZWxlY3RlZCA9ICcgc2VsZWN0ZWQ9XCJzZWxlY3RlZFwiICc7XG5cdFx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0XHRzZWxlY3RlZCA9ICcgJztcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICR0YWJsZV9zZWxlY3RfYmFja3VwICkuYXBwZW5kKCAnPG9wdGlvbicgKyBzZWxlY3RlZCArICd2YWx1ZT1cIicgKyB2YWx1ZSArICdcIj4nICsgdmFsdWUgKyAnICgnICsgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZV9zaXplc19oclsgdmFsdWUgXSArICcpPC9vcHRpb24+JyApO1xuXHRcdFx0XHRcdH0gKTtcblxuXHRcdFx0XHRcdCRwdXNoX3NlbGVjdF9iYWNrdXAgPSAkdGFibGVfc2VsZWN0X2JhY2t1cDtcblxuXHRcdFx0XHRcdGlmICggJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QnICk7XG5cdFx0XHRcdFx0XHQkKCAnI3NlbGVjdC1wb3N0LXR5cGVzJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5hZnRlciggJHB1bGxfcG9zdF90eXBlX3NlbGVjdCApO1xuXHRcdFx0XHRcdFx0JCggJyNzZWxlY3QtYmFja3VwJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0JCggJy5iYWNrdXAtdGFibGVzLXdyYXAnICkucHJlcGVuZCggJHB1bGxfc2VsZWN0X2JhY2t1cCApO1xuXHRcdFx0XHRcdFx0JCggJy50YWJsZS1wcmVmaXgnICkuaHRtbCggZGF0YS5wcmVmaXggKTtcblx0XHRcdFx0XHRcdCQoICcudXBsb2Fkcy1kaXInICkuaHRtbCggd3BtZGJfZGF0YS50aGlzX3VwbG9hZHNfZGlyICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdCQoICcjc2VsZWN0LWJhY2t1cCcgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdXNoX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3ZlcmlmeV9jb25uZWN0aW9uX3RvX3JlbW90ZV9zaXRlJywgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSApO1xuXHRcdFx0XHR9XG5cblx0XHRcdH0gKTtcblxuXHRcdH1cblxuXHRcdC8vIGF1dG9tYXRpY2FsbHkgdmFsaWRhdGUgY29ubmVjdGlvbiBpbmZvIGlmIHdlJ3JlIGxvYWRpbmcgYSBzYXZlZCBwcm9maWxlXG5cdFx0ZXN0YWJsaXNoX3JlbW90ZV9jb25uZWN0aW9uX2Zyb21fc2F2ZWRfcHJvZmlsZSgpO1xuXG5cdFx0Ly8gYWRkIHRvIDxhPiB0YWdzIHdoaWNoIGFjdCBhcyBKUyBldmVudCBidXR0b25zLCB3aWxsIG5vdCBqdW1wIHBhZ2UgdG8gdG9wIGFuZCB3aWxsIGRlc2VsZWN0IHRoZSBidXR0b25cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5qcy1hY3Rpb24tbGluaycsIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCggdGhpcyApLmJsdXIoKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBlbmFibGVfcHJvX2xpY2VuY2UoIGRhdGEsIGxpY2VuY2Vfa2V5ICkge1xuXHRcdFx0JCggJy5saWNlbmNlLWlucHV0LCAucmVnaXN0ZXItbGljZW5jZScgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcubGljZW5jZS1ub3QtZW50ZXJlZCcgKS5wcmVwZW5kKCBkYXRhLm1hc2tlZF9saWNlbmNlICk7XG5cdFx0XHQkKCAnLnN1cHBvcnQtY29udGVudCcgKS5lbXB0eSgpLmh0bWwoICc8cD4nICsgd3BtZGJfc3RyaW5ncy5mZXRjaGluZ19saWNlbnNlICsgJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwiYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+PC9wPicgKTtcblx0XHRcdGNoZWNrX2xpY2VuY2UoIGxpY2VuY2Vfa2V5ICk7XG5cblx0XHRcdCQoICcubWlncmF0ZS1zZWxlY3Rpb24gbGFiZWwnICkucmVtb3ZlQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdCQoICcubWlncmF0ZS1zZWxlY3Rpb24gaW5wdXQnICkucmVtb3ZlQXR0ciggJ2Rpc2FibGVkJyApO1xuXHRcdH1cblxuXHRcdCQoICcubGljZW5jZS1pbnB1dCcgKS5rZXlwcmVzcyggZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRpZiAoIDEzID09PSBlLndoaWNoICkge1xuXHRcdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHRcdCQoICcucmVnaXN0ZXItbGljZW5jZScgKS5jbGljaygpO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdC8vIHJlZ2lzdGVycyB5b3VyIGxpY2VuY2Vcblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5yZWdpc3Rlci1saWNlbmNlJywgZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cblx0XHRcdGlmICggZG9pbmdfbGljZW5jZV9yZWdpc3RyYXRpb25fYWpheCApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbGljZW5jZV9rZXkgPSAkLnRyaW0oICQoICcubGljZW5jZS1pbnB1dCcgKS52YWwoKSApO1xuXHRcdFx0dmFyICRsaWNlbmNlX3N0YXR1cyA9ICQoICcubGljZW5jZS1zdGF0dXMnICk7XG5cblx0XHRcdCRsaWNlbmNlX3N0YXR1cy5yZW1vdmVDbGFzcyggJ25vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZSBzdWNjZXNzLW5vdGljZScgKTtcblxuXHRcdFx0aWYgKCAnJyA9PT0gbGljZW5jZV9rZXkgKSB7XG5cdFx0XHRcdCRsaWNlbmNlX3N0YXR1cy5odG1sKCAnPGRpdiBjbGFzcz1cIm5vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZVwiPicgKyB3cG1kYl9zdHJpbmdzLmVudGVyX2xpY2Vuc2Vfa2V5ICsgJzwvZGl2PicgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHQkbGljZW5jZV9zdGF0dXMuZW1wdHkoKS5yZW1vdmVDbGFzcyggJ3N1Y2Nlc3MnICk7XG5cdFx0XHRkb2luZ19saWNlbmNlX3JlZ2lzdHJhdGlvbl9hamF4ID0gdHJ1ZTtcblx0XHRcdCQoICcuYnV0dG9uLnJlZ2lzdGVyLWxpY2VuY2UnICkuYWZ0ZXIoICc8aW1nIHNyYz1cIicgKyBzcGlubmVyX3VybCArICdcIiBhbHQ9XCJcIiBjbGFzcz1cInJlZ2lzdGVyLWxpY2VuY2UtYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JyApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnSlNPTicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2FjdGl2YXRlX2xpY2VuY2UnLFxuXHRcdFx0XHRcdGxpY2VuY2Vfa2V5OiBsaWNlbmNlX2tleSxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuYWN0aXZhdGVfbGljZW5jZSxcblx0XHRcdFx0XHRjb250ZXh0OiAnbGljZW5jZSdcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0ZG9pbmdfbGljZW5jZV9yZWdpc3RyYXRpb25fYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdCQoICcucmVnaXN0ZXItbGljZW5jZS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmh0bWwoIHdwbWRiX3N0cmluZ3MucmVnaXN0ZXJfbGljZW5zZV9wcm9ibGVtICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdGRvaW5nX2xpY2VuY2VfcmVnaXN0cmF0aW9uX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHQkKCAnLnJlZ2lzdGVyLWxpY2VuY2UtYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEuZXJyb3JzICkge1xuXHRcdFx0XHRcdFx0dmFyIG1zZyA9ICcnO1xuXHRcdFx0XHRcdFx0Zm9yICggdmFyIGtleSBpbiBkYXRhLmVycm9ycyApIHtcblx0XHRcdFx0XHRcdFx0bXNnICs9IGRhdGEuZXJyb3JzWyBrZXkgXTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCRsaWNlbmNlX3N0YXR1cy5odG1sKCBtc2cgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEubWFza2VkX2xpY2VuY2UgKSB7XG5cdFx0XHRcdFx0XHRcdGVuYWJsZV9wcm9fbGljZW5jZSggZGF0YSwgbGljZW5jZV9rZXkgKTtcblx0XHRcdFx0XHRcdFx0JCggJy5taWdyYXRlLXRhYiAuaW52YWxpZC1saWNlbmNlJyApLmhpZGUoKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEud3BtZGJfZXJyb3IgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLmJvZHkgKSB7XG5cdFx0XHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuaHRtbCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdGlmICggMSA9PT0gTnVtYmVyKCBkYXRhLmlzX2ZpcnN0X2FjdGl2YXRpb24gKSApIHtcblx0XHRcdFx0XHRcdFx0d3BtZGJfc3RyaW5ncy53ZWxjb21lX3RleHQgPSB3cG1kYl9zdHJpbmdzLndlbGNvbWVfdGV4dC5yZXBsYWNlKCAnJTEkcycsICdodHRwczovL2RlbGljaW91c2JyYWlucy5jb20vd3AtbWlncmF0ZS1kYi1wcm8vZG9jL3F1aWNrLXN0YXJ0LWd1aWRlLycgKTtcblx0XHRcdFx0XHRcdFx0d3BtZGJfc3RyaW5ncy53ZWxjb21lX3RleHQgPSB3cG1kYl9zdHJpbmdzLndlbGNvbWVfdGV4dC5yZXBsYWNlKCAnJTIkcycsICdodHRwczovL2RlbGljaW91c2JyYWlucy5jb20vd3AtbWlncmF0ZS1kYi1wcm8vdmlkZW9zLycgKTtcblxuXHRcdFx0XHRcdFx0XHQkbGljZW5jZV9zdGF0dXMuYWZ0ZXIoXG5cdFx0XHRcdFx0XHRcdFx0JzxkaXYgaWQ9XCJ3ZWxjb21lLXdyYXBcIj4nICtcblx0XHRcdFx0XHRcdFx0XHRcdCc8aW1nIGlkPVwid2VsY29tZS1pbWdcIiBzcmM9XCInICsgd3BtZGJfZGF0YS50aGlzX3BsdWdpbl91cmwgKyAnYXNzZXQvZGlzdC93ZWxjb21lLmpwZ1wiIC8+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnPGRpdiBjbGFzcz1cIndlbGNvbWUtdGV4dFwiPicgK1xuXHRcdFx0XHRcdFx0XHRcdFx0XHQnPGgzPicgKyB3cG1kYl9zdHJpbmdzLndlbGNvbWVfdGl0bGUgKyAnPC9oMz4nICtcblx0XHRcdFx0XHRcdFx0XHRcdFx0JzxwPicgKyB3cG1kYl9zdHJpbmdzLndlbGNvbWVfdGV4dCArICc8L3A+JyArXG5cdFx0XHRcdFx0XHRcdFx0XHQnPC9kaXY+JyArXG5cdFx0XHRcdFx0XHRcdFx0JzwvZGl2Pidcblx0XHRcdFx0XHRcdFx0KTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmh0bWwoIHdwbWRiX3N0cmluZ3MubGljZW5zZV9yZWdpc3RlcmVkICkuZGVsYXkoIDUwMDAgKS5mYWRlT3V0KCAxMDAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdFx0JCggdGhpcyApLmNzcyggeyB2aXNpYmlsaXR5OiAnaGlkZGVuJywgZGlzcGxheTogJ2Jsb2NrJyB9ICkuc2xpZGVVcCgpO1xuXHRcdFx0XHRcdFx0fSApO1xuXHRcdFx0XHRcdFx0JGxpY2VuY2Vfc3RhdHVzLmFkZENsYXNzKCAnc3VjY2VzcyBub3RpZmljYXRpb24tbWVzc2FnZSBzdWNjZXNzLW5vdGljZScgKTtcblx0XHRcdFx0XHRcdGVuYWJsZV9wcm9fbGljZW5jZSggZGF0YSwgbGljZW5jZV9rZXkgKTtcblx0XHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmhpZGUoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdH0gKTtcblxuXHRcdC8vIGNsZWFycyB0aGUgZGVidWcgbG9nXG5cdFx0JCggJy5jbGVhci1sb2cnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5kZWJ1Zy1sb2ctdGV4dGFyZWEnICkudmFsKCAnJyApO1xuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9jbGVhcl9sb2cnLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5jbGVhcl9sb2dcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MuY2xlYXJfbG9nX3Byb2JsZW0gKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9ICk7XG5cblx0XHQvLyB1cGRhdGVzIHRoZSBkZWJ1ZyBsb2cgd2hlbiB0aGUgdXNlciBzd2l0Y2hlcyB0byB0aGUgaGVscCB0YWJcblx0XHRmdW5jdGlvbiByZWZyZXNoX2RlYnVnX2xvZygpIHtcblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfZ2V0X2xvZycsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmdldF9sb2dcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MudXBkYXRlX2xvZ19wcm9ibGVtICk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcuZGVidWctbG9nLXRleHRhcmVhJyApLnZhbCggZGF0YSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fVxuXG5cdFx0Ly8gc2VsZWN0IGFsbCB0YWJsZXNcblx0XHQkKCAnLm11bHRpc2VsZWN0LXNlbGVjdC1hbGwnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG11bHRpc2VsZWN0ID0gJCggdGhpcyApLnBhcmVudHMoICcuc2VsZWN0LXdyYXAnICkuY2hpbGRyZW4oICcubXVsdGlzZWxlY3QnICk7XG5cdFx0XHQkKCAnb3B0aW9uJywgbXVsdGlzZWxlY3QgKS5wcm9wKCAnc2VsZWN0ZWQnLCAxICk7XG5cdFx0XHQkKCBtdWx0aXNlbGVjdCApLmZvY3VzKCkudHJpZ2dlciggJ2NoYW5nZScgKTtcblx0XHR9ICk7XG5cblx0XHQvLyBkZXNlbGVjdCBhbGwgdGFibGVzXG5cdFx0JCggJy5tdWx0aXNlbGVjdC1kZXNlbGVjdC1hbGwnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG11bHRpc2VsZWN0ID0gJCggdGhpcyApLnBhcmVudHMoICcuc2VsZWN0LXdyYXAnICkuY2hpbGRyZW4oICcubXVsdGlzZWxlY3QnICk7XG5cdFx0XHQkKCAnb3B0aW9uJywgbXVsdGlzZWxlY3QgKS5yZW1vdmVBdHRyKCAnc2VsZWN0ZWQnICk7XG5cdFx0XHQkKCBtdWx0aXNlbGVjdCApLmZvY3VzKCkudHJpZ2dlciggJ2NoYW5nZScgKTtcblx0XHR9ICk7XG5cblx0XHQvLyBpbnZlcnQgdGFibGUgc2VsZWN0aW9uXG5cdFx0JCggJy5tdWx0aXNlbGVjdC1pbnZlcnQtc2VsZWN0aW9uJyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBtdWx0aXNlbGVjdCA9ICQoIHRoaXMgKS5wYXJlbnRzKCAnLnNlbGVjdC13cmFwJyApLmNoaWxkcmVuKCAnLm11bHRpc2VsZWN0JyApO1xuXHRcdFx0JCggJ29wdGlvbicsIG11bHRpc2VsZWN0ICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoIHRoaXMgKS5hdHRyKCAnc2VsZWN0ZWQnLCAhJCggdGhpcyApLmF0dHIoICdzZWxlY3RlZCcgKSApO1xuXHRcdFx0fSApO1xuXHRcdFx0JCggbXVsdGlzZWxlY3QgKS5mb2N1cygpLnRyaWdnZXIoICdjaGFuZ2UnICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gb24gb3B0aW9uIHNlbGVjdCBoaWRlIGFsbCBcImFkdmFuY2VkXCIgb3B0aW9uIGRpdnMgYW5kIHNob3cgdGhlIGNvcnJlY3QgZGl2IGZvciB0aGUgb3B0aW9uIHNlbGVjdGVkXG5cdFx0JCggJy5vcHRpb24tZ3JvdXAgaW5wdXRbdHlwZT1yYWRpb10nICkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBncm91cCA9ICQoIHRoaXMgKS5jbG9zZXN0KCAnLm9wdGlvbi1ncm91cCcgKTtcblx0XHRcdCQoICd1bCcsIGdyb3VwICkuaGlkZSgpO1xuXHRcdFx0dmFyIHBhcmVudCA9ICQoIHRoaXMgKS5jbG9zZXN0KCAnbGknICk7XG5cdFx0XHQkKCAndWwnLCBwYXJlbnQgKS5zaG93KCk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gb24gcGFnZSBsb2FkLCBleHBhbmQgaGlkZGVuIGRpdnMgZm9yIHNlbGVjdGVkIG9wdGlvbnMgKGJyb3dzZXIgZm9ybSBjYWNoZSlcblx0XHQkKCAnLm9wdGlvbi1ncm91cCcgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcub3B0aW9uLWdyb3VwIGlucHV0W3R5cGU9cmFkaW9dJyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRpZiAoICQoIHRoaXMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdHZhciBwYXJlbnQgPSAkKCB0aGlzICkuY2xvc2VzdCggJ2xpJyApO1xuXHRcdFx0XHRcdCQoICd1bCcsIHBhcmVudCApLnNob3coKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXHRcdH0gKTtcblxuXHRcdC8vIGV4cGFuZCBhbmQgY29sbGFwc2UgY29udGVudCBvbiBjbGlja1xuXHRcdCQoICcuaGVhZGVyLWV4cGFuZC1jb2xsYXBzZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICQoICcuZXhwYW5kLWNvbGxhcHNlLWFycm93JywgdGhpcyApLmhhc0NsYXNzKCAnY29sbGFwc2VkJyApICkge1xuXHRcdFx0XHQkKCAnLmV4cGFuZC1jb2xsYXBzZS1hcnJvdycsIHRoaXMgKS5yZW1vdmVDbGFzcyggJ2NvbGxhcHNlZCcgKTtcblx0XHRcdFx0JCggdGhpcyApLm5leHQoKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLmV4cGFuZC1jb2xsYXBzZS1hcnJvdycsIHRoaXMgKS5hZGRDbGFzcyggJ2NvbGxhcHNlZCcgKTtcblx0XHRcdFx0JCggdGhpcyApLm5leHQoKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0JCggJy5jaGVja2JveC1sYWJlbCBpbnB1dFt0eXBlPWNoZWNrYm94XScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAkKCB0aGlzICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudCgpLm5leHQoKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkubmV4dCgpLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyB3YXJuaW5nIGZvciBleGNsdWRpbmcgcG9zdCB0eXBlc1xuXHRcdCQoICcuc2VsZWN0LXBvc3QtdHlwZXMtd3JhcCcgKS5vbiggJ2NoYW5nZScsICcjc2VsZWN0LXBvc3QtdHlwZXMnLCBmdW5jdGlvbigpIHtcblx0XHRcdGV4Y2x1ZGVfcG9zdF90eXBlc193YXJuaW5nKCk7XG5cdFx0fSApO1xuXG5cdFx0ZnVuY3Rpb24gZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKSB7XG5cdFx0XHR2YXIgZXhjbHVkZWRfcG9zdF90eXBlcyA9ICQoICcjc2VsZWN0LXBvc3QtdHlwZXMnICkudmFsKCk7XG5cdFx0XHR2YXIgZXhjbHVkZWRfcG9zdF90eXBlc190ZXh0ID0gJyc7XG5cdFx0XHR2YXIgJGV4Y2x1ZGVfcG9zdF90eXBlc193YXJuaW5nID0gJCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKTtcblxuXHRcdFx0aWYgKCBleGNsdWRlZF9wb3N0X3R5cGVzICkge1xuXHRcdFx0XHRleGNsdWRlZF9wb3N0X3R5cGVzX3RleHQgPSAnPGNvZGU+JyArIGV4Y2x1ZGVkX3Bvc3RfdHlwZXMuam9pbiggJzwvY29kZT4sIDxjb2RlPicgKSArICc8L2NvZGU+Jztcblx0XHRcdFx0JCggJy5leGNsdWRlZC1wb3N0LXR5cGVzJyApLmh0bWwoIGV4Y2x1ZGVkX3Bvc3RfdHlwZXNfdGV4dCApO1xuXG5cdFx0XHRcdGlmICggJzAnID09PSAkZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcuY3NzKCAnb3BhY2l0eScgKSApIHtcblx0XHRcdFx0XHQkZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmdcblx0XHRcdFx0XHRcdC5jc3MoIHsgb3BhY2l0eTogMCB9IClcblx0XHRcdFx0XHRcdC5zbGlkZURvd24oIDIwMCApXG5cdFx0XHRcdFx0XHQuYW5pbWF0ZSggeyBvcGFjaXR5OiAxIH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0JGV4Y2x1ZGVfcG9zdF90eXBlc193YXJuaW5nXG5cdFx0XHRcdFx0LmNzcyggeyBvcGFjaXR5OiAwIH0gKVxuXHRcdFx0XHRcdC5zbGlkZVVwKCAyMDAgKVxuXHRcdFx0XHRcdC5hbmltYXRlKCB7IG9wYWNpdHk6IDAgfSApO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICggJCggJyNleGNsdWRlLXBvc3QtdHlwZXMnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdGlmICggJCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS52YWwoKSApIHtcblx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5jc3MoIHsgZGlzcGxheTogJ2Jsb2NrJywgb3BhY2l0eTogMSB9ICk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0Ly8gc3BlY2lhbCBleHBhbmQgYW5kIGNvbGxhcHNlIGNvbnRlbnQgb24gY2xpY2sgZm9yIHNhdmUgbWlncmF0aW9uIHByb2ZpbGVcblx0XHQkKCAnI3NhdmUtbWlncmF0aW9uLXByb2ZpbGUnICkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblx0XHRcdHdwbWRiLmZ1bmN0aW9ucy51cGRhdGVfbWlncmF0ZV9idXR0b25fdGV4dCgpO1xuXHRcdFx0aWYgKCAkKCB0aGlzICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5zaG93KCk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHRpZiAoICQoICcjc2F2ZS1taWdyYXRpb24tcHJvZmlsZScgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5zaG93KCk7XG5cdFx0fVxuXG5cdFx0JCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkuZm9jdXMoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJyNjcmVhdGVfbmV3JyApLnByb3AoICdjaGVja2VkJywgdHJ1ZSApO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuY2hlY2tib3gtbGFiZWwgaW5wdXRbdHlwZT1jaGVja2JveF0nICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICQoIHRoaXMgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHQkKCB0aGlzICkucGFyZW50KCkubmV4dCgpLnNob3coKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyBBSkFYIG1pZ3JhdGUgYnV0dG9uXG5cdFx0JCggJy5taWdyYXRlLWRiLWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0JCggdGhpcyApLmJsdXIoKTtcblx0XHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR3cG1kYi5taWdyYXRpb25fc3RhdGVfaWQgPSAnJztcblxuXHRcdFx0aWYgKCBmYWxzZSA9PT0gJC53cG1kYi5hcHBseV9maWx0ZXJzKCAnd3BtZGJfbWlncmF0aW9uX3Byb2ZpbGVfcmVhZHknLCB0cnVlICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgdGhhdCB0aGV5J3ZlIHNlbGVjdGVkIHNvbWUgdGFibGVzIHRvIG1pZ3JhdGVcblx0XHRcdGlmICggJCggJyNtaWdyYXRlLXNlbGVjdGVkJyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtdGFibGVzJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIHRoYXQgdGhleSd2ZSBzZWxlY3RlZCBzb21lIHRhYmxlcyB0byBiYWNrdXBcblx0XHRcdGlmICggJ3NhdmVmaWxlJyAhPT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSAmJiAkKCAnI2JhY2t1cC1tYW51YWwtc2VsZWN0JyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtYmFja3VwJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZV9iYWNrdXAgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgbmV3X3VybF9taXNzaW5nID0gZmFsc2U7XG5cdFx0XHR2YXIgbmV3X2ZpbGVfcGF0aF9taXNzaW5nID0gZmFsc2U7XG5cdFx0XHRpZiAoICQoICcjbmV3LXVybCcgKS5sZW5ndGggJiYgISQoICcjbmV3LXVybCcgKS52YWwoKSApIHtcblx0XHRcdFx0JCggJyNuZXctdXJsLW1pc3Npbmctd2FybmluZycgKS5zaG93KCk7XG5cdFx0XHRcdCQoICcjbmV3LXVybCcgKS5mb2N1cygpO1xuXHRcdFx0XHQkKCAnaHRtbCxib2R5JyApLnNjcm9sbFRvcCggMCApO1xuXHRcdFx0XHRuZXdfdXJsX21pc3NpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICQoICcjbmV3LXBhdGgnICkubGVuZ3RoICYmICEkKCAnI25ldy1wYXRoJyApLnZhbCgpICkge1xuXHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZycgKS5zaG93KCk7XG5cdFx0XHRcdGlmICggZmFsc2UgPT09IG5ld191cmxfbWlzc2luZyApIHtcblx0XHRcdFx0XHQkKCAnI25ldy1wYXRoJyApLmZvY3VzKCk7XG5cdFx0XHRcdFx0JCggJ2h0bWwsYm9keScgKS5zY3JvbGxUb3AoIDAgKTtcblx0XHRcdFx0fVxuXHRcdFx0XHRuZXdfZmlsZV9wYXRoX21pc3NpbmcgPSB0cnVlO1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoIHRydWUgPT09IG5ld191cmxfbWlzc2luZyB8fCB0cnVlID09PSBuZXdfZmlsZV9wYXRoX21pc3NpbmcgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gYWxzbyBzYXZlIHByb2ZpbGVcblx0XHRcdGlmICggJCggJyNzYXZlLW1pZ3JhdGlvbi1wcm9maWxlJyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdHNhdmVfYWN0aXZlX3Byb2ZpbGUoKTtcblx0XHRcdH1cblxuXHRcdFx0Zm9ybV9kYXRhID0gJCggJCggJyNtaWdyYXRlLWZvcm0nIClbMF0uZWxlbWVudHMgKS5ub3QoICcuYXV0aC1jcmVkZW50aWFscycgKS5zZXJpYWxpemUoKTtcblxuXHRcdFx0bWlncmF0aW9uX2ludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cblx0XHRcdHN0YWdlID0gJ2JhY2t1cCc7XG5cblx0XHRcdGlmICggJ3NhdmVmaWxlJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0c3RhZ2UgPSAnbWlncmF0ZSc7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggZmFsc2UgPT09ICQoICcjY3JlYXRlLWJhY2t1cCcgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRzdGFnZSA9ICdtaWdyYXRlJztcblx0XHRcdH1cblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24gPSB3cG1kYi5taWdyYXRpb25fcHJvZ3Jlc3NfY29udHJvbGxlci5uZXdNaWdyYXRpb24oIHtcblx0XHRcdFx0J2xvY2FsVGFibGVTaXplcyc6IHdwbWRiX2RhdGEudGhpc190YWJsZV9zaXplcyxcblx0XHRcdFx0J2xvY2FsVGFibGVSb3dzJzogd3BtZGJfZGF0YS50aGlzX3RhYmxlX3Jvd3MsXG5cdFx0XHRcdCdyZW1vdGVUYWJsZVNpemVzJzogJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhID8gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS50YWJsZV9zaXplcyA6IG51bGwsXG5cdFx0XHRcdCdyZW1vdGVUYWJsZVJvd3MnOiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgPyB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlX3Jvd3MgOiBudWxsLFxuXHRcdFx0XHQnbWlncmF0aW9uSW50ZW50Jzogd3BtZGJfbWlncmF0aW9uX3R5cGUoKVxuXHRcdFx0fSApO1xuXG5cdFx0XHR2YXIgYmFja3VwX29wdGlvbiA9ICQoICdpbnB1dFtuYW1lPWJhY2t1cF9vcHRpb25dOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgdGFibGVfb3B0aW9uID0gJCggJ2lucHV0W25hbWU9dGFibGVfbWlncmF0ZV9vcHRpb25dOmNoZWNrZWQnICkudmFsKCk7XG5cdFx0XHR2YXIgc2VsZWN0ZWRfdGFibGVzID0gJyc7XG5cdFx0XHR2YXIgZGF0YV90eXBlID0gJyc7XG5cblx0XHRcdC8vIHNldCB1cCBiYWNrdXAgc3RhZ2Vcblx0XHRcdGlmICggJ2JhY2t1cCcgPT09IHN0YWdlICkge1xuXHRcdFx0XHRpZiAoICdtaWdyYXRlX29ubHlfd2l0aF9wcmVmaXgnID09PSB0YWJsZV9vcHRpb24gJiYgJ2JhY2t1cF9zZWxlY3RlZCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0YmFja3VwX29wdGlvbiA9ICdiYWNrdXBfb25seV93aXRoX3ByZWZpeCc7XG5cdFx0XHRcdH1cblx0XHRcdFx0aWYgKCAncHVzaCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdFx0ZGF0YV90eXBlID0gJ3JlbW90ZSc7XG5cdFx0XHRcdFx0aWYgKCAnYmFja3VwX29ubHlfd2l0aF9wcmVmaXgnID09PSBiYWNrdXBfb3B0aW9uICkge1xuXHRcdFx0XHRcdFx0dGFibGVzX3RvX21pZ3JhdGUgPSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnByZWZpeGVkX3RhYmxlcztcblx0XHRcdFx0XHR9IGVsc2UgaWYgKCAnYmFja3VwX3NlbGVjdGVkJyA9PT0gYmFja3VwX29wdGlvbiApIHtcblx0XHRcdFx0XHRcdHNlbGVjdGVkX3RhYmxlcyA9ICQoICcjc2VsZWN0LXRhYmxlcycgKS52YWwoKTtcblx0XHRcdFx0XHRcdHNlbGVjdGVkX3RhYmxlcyA9ICQud3BtZGIuYXBwbHlfZmlsdGVycyggJ3dwbWRiX2JhY2t1cF9zZWxlY3RlZF90YWJsZXMnLCBzZWxlY3RlZF90YWJsZXMgKTtcblx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gZ2V0X2ludGVyc2VjdCggc2VsZWN0ZWRfdGFibGVzLCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRhYmxlcyApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICdiYWNrdXBfbWFudWFsX3NlbGVjdCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9ICQoICcjc2VsZWN0LWJhY2t1cCcgKS52YWwoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0ZGF0YV90eXBlID0gJ2xvY2FsJztcblx0XHRcdFx0XHRpZiAoICdiYWNrdXBfb25seV93aXRoX3ByZWZpeCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9IHdwbWRiX2RhdGEudGhpc19wcmVmaXhlZF90YWJsZXM7XG5cdFx0XHRcdFx0fSBlbHNlIGlmICggJ2JhY2t1cF9zZWxlY3RlZCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZF90YWJsZXMgPSAkKCAnI3NlbGVjdC10YWJsZXMnICkudmFsKCk7XG5cdFx0XHRcdFx0XHRzZWxlY3RlZF90YWJsZXMgPSAkLndwbWRiLmFwcGx5X2ZpbHRlcnMoICd3cG1kYl9iYWNrdXBfc2VsZWN0ZWRfdGFibGVzJywgc2VsZWN0ZWRfdGFibGVzICk7XG5cdFx0XHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9IGdldF9pbnRlcnNlY3QoIHNlbGVjdGVkX3RhYmxlcywgd3BtZGJfZGF0YS50aGlzX3RhYmxlcyApO1xuXHRcdFx0XHRcdH0gZWxzZSBpZiAoICdiYWNrdXBfbWFudWFsX3NlbGVjdCcgPT09IGJhY2t1cF9vcHRpb24gKSB7XG5cdFx0XHRcdFx0XHR0YWJsZXNfdG9fbWlncmF0ZSA9ICQoICcjc2VsZWN0LWJhY2t1cCcgKS52YWwoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblxuXHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5hZGRTdGFnZSggJ2JhY2t1cCcsIHRhYmxlc190b19taWdyYXRlLCBkYXRhX3R5cGUsIHtcblx0XHRcdFx0XHRzdHJpbmdzOiB7XG5cdFx0XHRcdFx0XHRtaWdyYXRlZDogd3BtZGJfc3RyaW5ncy5iYWNrZWRfdXBcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblxuXHRcdFx0Ly8gc2V0IHVwIG1pZ3JhdGlvbiBzdGFnZVxuXHRcdFx0aWYgKCAncHVzaCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgfHwgJ3NhdmVmaWxlJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0ZGF0YV90eXBlID0gJ2xvY2FsJztcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRhdGFfdHlwZSA9ICdyZW1vdGUnO1xuXHRcdFx0fVxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ubW9kZWwuYWRkU3RhZ2UoICdtaWdyYXRlJywgZ2V0X3RhYmxlc190b19taWdyYXRlKCBudWxsLCBudWxsICksIGRhdGFfdHlwZSApO1xuXG5cdFx0XHQvLyBhZGQgYW55IGFkZGl0aW9uYWwgbWlncmF0aW9uIHN0YWdlcyB2aWEgaG9va1xuXHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl9hZGRfbWlncmF0aW9uX3N0YWdlcycsIHtcblx0XHRcdFx0J2RhdGFfdHlwZSc6IGRhdGFfdHlwZSxcblx0XHRcdFx0J3RhYmxlc190b19taWdyYXRlJzogZ2V0X3RhYmxlc190b19taWdyYXRlKCBudWxsLCBudWxsIClcblx0XHRcdH0gKTtcblxuXHRcdFx0dmFyIHRhYmxlX2ludGVudCA9ICQoICdpbnB1dFtuYW1lPXRhYmxlX21pZ3JhdGVfb3B0aW9uXTpjaGVja2VkJyApLnZhbCgpO1xuXHRcdFx0dmFyIGNvbm5lY3Rpb25faW5mbyA9ICQudHJpbSggJCggJy5wdWxsLXB1c2gtY29ubmVjdGlvbi1pbmZvJyApLnZhbCgpICkuc3BsaXQoICdcXG4nICk7XG5cdFx0XHR2YXIgdGFibGVfcm93cyA9ICcnO1xuXG5cdFx0XHRyZW1vdGVfc2l0ZSA9IGNvbm5lY3Rpb25faW5mb1sgMCBdO1xuXHRcdFx0c2VjcmV0X2tleSA9IGNvbm5lY3Rpb25faW5mb1sgMSBdO1xuXG5cdFx0XHR2YXIgc3RhdGljX21pZ3JhdGlvbl9sYWJlbCA9ICcnO1xuXG5cdFx0XHRjb21wbGV0ZWRfbXNnID0gd3BtZGJfc3RyaW5ncy5leHBvcnRpbmdfY29tcGxldGU7XG5cblx0XHRcdGlmICggJ3NhdmVmaWxlJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0c3RhdGljX21pZ3JhdGlvbl9sYWJlbCA9IHdwbWRiX3N0cmluZ3MuZXhwb3J0aW5nX3BsZWFzZV93YWl0O1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0c3RhdGljX21pZ3JhdGlvbl9sYWJlbCA9IGdldF9taWdyYXRpb25fc3RhdHVzX2xhYmVsKCByZW1vdGVfc2l0ZSwgbWlncmF0aW9uX2ludGVudCwgJ21pZ3JhdGluZycgKTtcblx0XHRcdFx0Y29tcGxldGVkX21zZyA9IGdldF9taWdyYXRpb25fc3RhdHVzX2xhYmVsKCByZW1vdGVfc2l0ZSwgbWlncmF0aW9uX2ludGVudCwgJ2NvbXBsZXRlZCcgKTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAnYmFja3VwJyA9PT0gc3RhZ2UgKSB7XG5cdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gd3BtZGIuY3VycmVudF9taWdyYXRpb24ubW9kZWwuZ2V0U3RhZ2VJdGVtcyggJ2JhY2t1cCcsICduYW1lJyApO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dGFibGVzX3RvX21pZ3JhdGUgPSB3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5nZXRTdGFnZUl0ZW1zKCAnbWlncmF0ZScsICduYW1lJyApO1xuXHRcdFx0fVxuXG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5zZXRBY3RpdmVTdGFnZSggc3RhZ2UgKTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0VGl0bGUoIHN0YXRpY19taWdyYXRpb25fbGFiZWwgKTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc3RhcnRUaW1lcigpO1xuXG5cdFx0XHRjdXJyZW50bHlfbWlncmF0aW5nID0gdHJ1ZTtcblx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXR1cyggJ2FjdGl2ZScgKTtcblxuXHRcdFx0dmFyIHJlcXVlc3RfZGF0YSA9IHtcblx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfaW5pdGlhdGVfbWlncmF0aW9uJyxcblx0XHRcdFx0aW50ZW50OiBtaWdyYXRpb25faW50ZW50LFxuXHRcdFx0XHR1cmw6IHJlbW90ZV9zaXRlLFxuXHRcdFx0XHRrZXk6IHNlY3JldF9rZXksXG5cdFx0XHRcdGZvcm1fZGF0YTogZm9ybV9kYXRhLFxuXHRcdFx0XHRzdGFnZTogc3RhZ2UsXG5cdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5pbml0aWF0ZV9taWdyYXRpb25cblx0XHRcdH07XG5cblx0XHRcdHJlcXVlc3RfZGF0YS5zaXRlX2RldGFpbHMgPSB7XG5cdFx0XHRcdGxvY2FsOiB3cG1kYl9kYXRhLnNpdGVfZGV0YWlsc1xuXHRcdFx0fTtcblxuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRyZXF1ZXN0X2RhdGEudGVtcF9wcmVmaXggPSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnRlbXBfcHJlZml4O1xuXHRcdFx0XHRyZXF1ZXN0X2RhdGEuc2l0ZV9kZXRhaWxzLnJlbW90ZSA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuc2l0ZV9kZXRhaWxzO1xuXHRcdFx0fVxuXG5cdFx0XHQvLyBzaXRlX2RldGFpbHMgY2FuIGhhdmUgYSB2ZXJ5IGxhcmdlIG51bWJlciBvZiBlbGVtZW50cyB0aGF0IGJsb3dzIG91dCBQSFAncyBtYXhfaW5wdXRfdmFyc1xuXHRcdFx0Ly8gc28gd2UgcmVkdWNlIGl0IGRvd24gdG8gb25lIHZhcmlhYmxlIGZvciB0aGlzIG9uZSBQT1NULlxuXHRcdFx0cmVxdWVzdF9kYXRhLnNpdGVfZGV0YWlscyA9IEpTT04uc3RyaW5naWZ5KCByZXF1ZXN0X2RhdGEuc2l0ZV9kZXRhaWxzICk7XG5cblx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YTogcmVxdWVzdF9kYXRhLFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblxuXHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxMTIpJywganFYSFIgKSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0Y29uc29sZS5sb2coIGpxWEhSICk7XG5cdFx0XHRcdFx0Y29uc29sZS5sb2coIHRleHRTdGF0dXMgKTtcblx0XHRcdFx0XHRjb25zb2xlLmxvZyggZXJyb3JUaHJvd24gKTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YSAmJiAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEud3BtZGJfZXJyb3IgJiYgMSA9PT0gZGF0YS53cG1kYl9lcnJvciApIHtcblx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIGRhdGEuYm9keSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0d3BtZGIubWlncmF0aW9uX3N0YXRlX2lkID0gZGF0YS5taWdyYXRpb25fc3RhdGVfaWQ7XG5cblx0XHRcdFx0XHR2YXIgaSA9IDA7XG5cblx0XHRcdFx0XHQvLyBTZXQgZGVsYXkgYmV0d2VlbiByZXF1ZXN0cyAtIHVzZSBtYXggb2YgbG9jYWwvcmVtb3RlIHZhbHVlcywgMCBpZiBkb2luZyBleHBvcnRcblx0XHRcdFx0XHRkZWxheV9iZXR3ZWVuX3JlcXVlc3RzID0gMDtcblx0XHRcdFx0XHRpZiAoICdzYXZlZmlsZScgIT09IG1pZ3JhdGlvbl9pbnRlbnQgJiYgJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhICYmICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzICkge1xuXHRcdFx0XHRcdFx0ZGVsYXlfYmV0d2Vlbl9yZXF1ZXN0cyA9IE1hdGgubWF4KCBwYXJzZUludCggd3BtZGJfZGF0YS5kZWxheV9iZXR3ZWVuX3JlcXVlc3RzICksIHBhcnNlSW50KCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLmRlbGF5X2JldHdlZW5fcmVxdWVzdHMgKSApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRlX3RhYmxlX3JlY3Vyc2l2ZSA9IGZ1bmN0aW9uKCBjdXJyZW50X3JvdywgcHJpbWFyeV9rZXlzICkge1xuXG5cdFx0XHRcdFx0XHRpZiAoIGkgPj0gdGFibGVzX3RvX21pZ3JhdGUubGVuZ3RoICkge1xuXHRcdFx0XHRcdFx0XHRpZiAoICdiYWNrdXAnID09PSBzdGFnZSApIHtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5zZXRBY3RpdmVTdGFnZSggJ21pZ3JhdGUnICk7XG5cblx0XHRcdFx0XHRcdFx0XHRzdGFnZSA9ICdtaWdyYXRlJztcblx0XHRcdFx0XHRcdFx0XHRpID0gMDtcblxuXHRcdFx0XHRcdFx0XHRcdC8vIHNob3VsZCBnZXQgZnJvbSBtb2RlbFxuXHRcdFx0XHRcdFx0XHRcdHRhYmxlc190b19taWdyYXRlID0gZ2V0X3RhYmxlc190b19taWdyYXRlKCBudWxsLCBudWxsICk7XG5cblx0XHRcdFx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHRcdFx0XHQkKCAnLnByb2dyZXNzLWxhYmVsJyApLnJlbW92ZUNsYXNzKCAnbGFiZWwtdmlzaWJsZScgKTtcblxuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcyA9ICQud3BtZGIuYXBwbHlfZmlsdGVycyggJ3dwbWRiX2JlZm9yZV9taWdyYXRpb25fY29tcGxldGVfaG9va3MnLCB3cG1kYi5jb21tb24uaG9va3MgKTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24uaG9va3MucHVzaCggd3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZSApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcy5wdXNoKCB3cG1kYi5mdW5jdGlvbnMud3BtZGJfZmx1c2ggKTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24uaG9va3MgPSAkLndwbWRiLmFwcGx5X2ZpbHRlcnMoICd3cG1kYl9hZnRlcl9taWdyYXRpb25fY29tcGxldGVfaG9va3MnLCB3cG1kYi5jb21tb24uaG9va3MgKTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24uaG9va3MucHVzaCggd3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMgKTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHsgZm46IHdwbWRiX2NhbGxfbmV4dF9ob29rIH07XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHZhciBsYXN0X3RhYmxlID0gMDtcblx0XHRcdFx0XHRcdGlmICggaSA9PT0gKCB0YWJsZXNfdG9fbWlncmF0ZS5sZW5ndGggLSAxICkgKSB7XG5cdFx0XHRcdFx0XHRcdGxhc3RfdGFibGUgPSAxO1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHR2YXIgZ3ppcCA9IDA7XG5cdFx0XHRcdFx0XHRpZiAoICdzYXZlZmlsZScgIT09IG1pZ3JhdGlvbl9pbnRlbnQgJiYgMSA9PT0gcGFyc2VJbnQoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuZ3ppcCApICkge1xuXHRcdFx0XHRcdFx0XHRnemlwID0gMTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0dmFyIHJlcXVlc3RfZGF0YSA9IHtcblx0XHRcdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfbWlncmF0ZV90YWJsZScsXG5cdFx0XHRcdFx0XHRcdG1pZ3JhdGlvbl9zdGF0ZV9pZDogd3BtZGIubWlncmF0aW9uX3N0YXRlX2lkLFxuXHRcdFx0XHRcdFx0XHR0YWJsZTogdGFibGVzX3RvX21pZ3JhdGVbIGkgXSxcblx0XHRcdFx0XHRcdFx0c3RhZ2U6IHN0YWdlLFxuXHRcdFx0XHRcdFx0XHRjdXJyZW50X3JvdzogY3VycmVudF9yb3csXG5cdFx0XHRcdFx0XHRcdGxhc3RfdGFibGU6IGxhc3RfdGFibGUsXG5cdFx0XHRcdFx0XHRcdHByaW1hcnlfa2V5czogcHJpbWFyeV9rZXlzLFxuXHRcdFx0XHRcdFx0XHRnemlwOiBnemlwLFxuXHRcdFx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMubWlncmF0ZV90YWJsZVxuXHRcdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRcdFx0XHRyZXF1ZXN0X2RhdGEuYm90dGxlbmVjayA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEuYm90dGxlbmVjaztcblx0XHRcdFx0XHRcdFx0cmVxdWVzdF9kYXRhLnByZWZpeCA9IHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucHJlZml4O1xuXHRcdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0XHRpZiAoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEgJiYgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wYXRoX2N1cnJlbnRfc2l0ZSAmJiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLmRvbWFpbiApIHtcblx0XHRcdFx0XHRcdFx0cmVxdWVzdF9kYXRhLnBhdGhfY3VycmVudF9zaXRlID0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wYXRoX2N1cnJlbnRfc2l0ZTtcblx0XHRcdFx0XHRcdFx0cmVxdWVzdF9kYXRhLmRvbWFpbl9jdXJyZW50X3NpdGUgPSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLmRvbWFpbjtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cblx0XHRcdFx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRcdFx0XHR0aW1lb3V0OiAwLFxuXHRcdFx0XHRcdFx0XHRkYXRhOiByZXF1ZXN0X2RhdGEsXG5cdFx0XHRcdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdFx0XHRcdHZhciBwcm9ncmVzc190ZXh0ID0gd3BtZGJfc3RyaW5ncy50YWJsZV9wcm9jZXNzX3Byb2JsZW0gKyAnICcgKyB0YWJsZXNfdG9fbWlncmF0ZVsgaSBdICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICc6ICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJzo8YnIgLz4nICsganFYSFIucmVzcG9uc2VUZXh0O1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIHByb2dyZXNzX3RleHQsICdlcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZygganFYSFIgKTtcblx0XHRcdFx0XHRcdFx0XHRjb25zb2xlLmxvZyggdGV4dFN0YXR1cyApO1xuXHRcdFx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCBlcnJvclRocm93biApO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRcdFx0ZGF0YSA9ICQudHJpbSggZGF0YSApO1xuXHRcdFx0XHRcdFx0XHRcdHZhciByb3dfaW5mb3JtYXRpb24gPSB3cG1kYl9wYXJzZV9qc29uKCBkYXRhICk7XG5cdFx0XHRcdFx0XHRcdFx0dmFyIGVycm9yX3RleHQgPSAnJztcblxuXHRcdFx0XHRcdFx0XHRcdGlmICggZmFsc2UgPT09IHJvd19pbmZvcm1hdGlvbiB8fCBudWxsID09PSByb3dfaW5mb3JtYXRpb24gKSB7XG5cblx0XHRcdFx0XHRcdFx0XHRcdC8vIHNob3VsZCB1cGRhdGUgbW9kZWxcblx0XHRcdFx0XHRcdFx0XHRcdGlmICggJycgPT09IGRhdGEgfHwgbnVsbCA9PT0gZGF0YSApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZXJyb3JfdGV4dCA9IHdwbWRiX3N0cmluZ3MudGFibGVfcHJvY2Vzc19wcm9ibGVtX2VtcHR5X3Jlc3BvbnNlICsgJyAnICsgdGFibGVzX3RvX21pZ3JhdGVbIGkgXTtcblx0XHRcdFx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRcdGVycm9yX3RleHQgPSBnZXRfYWpheF9lcnJvcnMoIGRhdGEsIG51bGwsIG51bGwgKTtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgZXJyb3JfdGV4dCwgJ2Vycm9yJyApO1xuXHRcdFx0XHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiByb3dfaW5mb3JtYXRpb24ud3BtZGJfZXJyb3IgJiYgMSA9PT0gcm93X2luZm9ybWF0aW9uLndwbWRiX2Vycm9yICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgcm93X2luZm9ybWF0aW9uLmJvZHksICdlcnJvcicgKTtcblx0XHRcdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHQvL3N1Y2Nlc3NmdWwgaXRlcmF0aW9uLCB1cGRhdGUgbW9kZWxcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRUZXh0KCk7XG5cdFx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ubW9kZWwuZ2V0U3RhZ2VNb2RlbCggc3RhZ2UgKS5zZXRJdGVtTW9kZWxSb3dzVHJhbnNmZXJyZWQoIHRhYmxlc190b19taWdyYXRlWyBpIF0sIHJvd19pbmZvcm1hdGlvbi5jdXJyZW50X3JvdyApO1xuXG5cdFx0XHRcdFx0XHRcdFx0Ly8gV2UgbmVlZCB0aGUgcmV0dXJuZWQgZmlsZSBuYW1lIGZvciBkZWxpdmVyeSBvciBkaXNwbGF5IHRvIHRoZSB1c2VyLlxuXHRcdFx0XHRcdFx0XHRcdGlmICggMSA9PT0gbGFzdF90YWJsZSAmJiAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIHJvd19pbmZvcm1hdGlvbi5kdW1wX2ZpbGVuYW1lICkge1xuXHRcdFx0XHRcdFx0XHRcdFx0XHRkdW1wX2ZpbGVuYW1lID0gcm93X2luZm9ybWF0aW9uLmR1bXBfZmlsZW5hbWU7XG5cdFx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2Ygcm93X2luZm9ybWF0aW9uLmR1bXBfcGF0aCApIHtcblx0XHRcdFx0XHRcdFx0XHRcdFx0ZHVtcF9wYXRoID0gcm93X2luZm9ybWF0aW9uLmR1bXBfcGF0aDtcblx0XHRcdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHRpZiAoIC0xID09PSBwYXJzZUludCggcm93X2luZm9ybWF0aW9uLmN1cnJlbnRfcm93ICkgKSB7XG5cdFx0XHRcdFx0XHRcdFx0XHRpKys7XG5cdFx0XHRcdFx0XHRcdFx0XHRyb3dfaW5mb3JtYXRpb24uY3VycmVudF9yb3cgPSAnJztcblx0XHRcdFx0XHRcdFx0XHRcdHJvd19pbmZvcm1hdGlvbi5wcmltYXJ5X2tleXMgPSAnJztcblx0XHRcdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHtcblx0XHRcdFx0XHRcdFx0XHRcdGZuOiB3cG1kYi5mdW5jdGlvbnMubWlncmF0ZV90YWJsZV9yZWN1cnNpdmUsXG5cdFx0XHRcdFx0XHRcdFx0XHRhcmdzOiBbIHJvd19pbmZvcm1hdGlvbi5jdXJyZW50X3Jvdywgcm93X2luZm9ybWF0aW9uLnByaW1hcnlfa2V5cyBdXG5cdFx0XHRcdFx0XHRcdFx0fTtcblx0XHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0fTtcblxuXHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5uZXh0X3N0ZXBfaW5fbWlncmF0aW9uID0ge1xuXHRcdFx0XHRcdFx0Zm46IHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRlX3RhYmxlX3JlY3Vyc2l2ZSxcblx0XHRcdFx0XHRcdGFyZ3M6IFsgJy0xJywgJycgXVxuXHRcdFx0XHRcdH07XG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cblx0XHRcdFx0fVxuXG5cdFx0XHR9ICk7IC8vIGVuZCBhamF4XG5cblx0XHR9ICk7XG5cblx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cyA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciApIHtcblx0XHRcdFx0aWYgKCAnJyA9PT0gd3BtZGIuY29tbW9uLm5vbl9mYXRhbF9lcnJvcnMgKSB7XG5cdFx0XHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICYmIHRydWUgPT09ICQoICcjc2F2ZV9jb21wdXRlcicgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0VGV4dCgpO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX2NhbmNlbGxlZCApIHtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBjb21wbGV0ZWRfbXNnICsgJyZuYnNwOzxkaXYgY2xhc3M9XCJkYXNoaWNvbnMgZGFzaGljb25zLXllc1wiPjwvZGl2PicsIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NhbmNlbGxlZF9zdWNjZXNzLCAnY2FuY2VsbGVkJyApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggY29tcGxldGVkX21zZyArICcmbmJzcDs8ZGl2IGNsYXNzPVwiZGFzaGljb25zIGRhc2hpY29ucy15ZXNcIj48L2Rpdj4nLCAnJywgJ2NvbXBsZXRlJyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLmNvbXBsZXRlZF93aXRoX3NvbWVfZXJyb3JzLCB3cG1kYi5jb21tb24ubm9uX2ZhdGFsX2Vycm9ycywgJ2Vycm9yJyApO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdCQoICcubWlncmF0aW9uLWNvbnRyb2xzJyApLmFkZENsYXNzKCAnaGlkZGVuJyApO1xuXG5cdFx0XHQvLyByZXNldCBtaWdyYXRpb24gdmFyaWFibGVzIHNvIGNvbnNlY3V0aXZlIG1pZ3JhdGlvbnMgd29yayBjb3JyZWN0bHlcblx0XHRcdHdwbWRiLmNvbW1vbi5ob29rcyA9IFtdO1xuXHRcdFx0d3BtZGIuY29tbW9uLmNhbGxfc3RhY2sgPSBbXTtcblx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSBmYWxzZTtcblx0XHRcdGN1cnJlbnRseV9taWdyYXRpbmcgPSBmYWxzZTtcblx0XHRcdG1pZ3JhdGlvbl9jb21wbGV0ZWQgPSB0cnVlO1xuXHRcdFx0bWlncmF0aW9uX3BhdXNlZCA9IGZhbHNlO1xuXHRcdFx0bWlncmF0aW9uX2NhbmNlbGxlZCA9IGZhbHNlO1xuXHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0d3BtZGIuY29tbW9uLm5vbl9mYXRhbF9lcnJvcnMgPSAnJztcblxuXHRcdFx0JCggJy5wcm9ncmVzcy1sYWJlbCcgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcubWlncmF0aW9uLXByb2dyZXNzLWFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdCQoICcuY2xvc2UtcHJvZ3Jlc3MtY29udGVudCcgKS5zaG93KCk7XG5cdFx0XHQkKCAnI292ZXJsYXknICkuY3NzKCAnY3Vyc29yJywgJ3BvaW50ZXInICk7XG5cdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5tb2RlbC5zZXRNaWdyYXRpb25Db21wbGV0ZSgpO1xuXHRcdH07XG5cblx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdCQoICcubWlncmF0aW9uLWNvbnRyb2xzJyApLmFkZENsYXNzKCAnaGlkZGVuJyApO1xuXG5cdFx0XHRpZiAoICdzYXZlZmlsZScgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdGN1cnJlbnRseV9taWdyYXRpbmcgPSBmYWxzZTtcblx0XHRcdFx0dmFyIG1pZ3JhdGVfY29tcGxldGVfdGV4dCA9IHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NvbXBsZXRlO1xuXHRcdFx0XHRpZiAoICQoICcjc2F2ZV9jb21wdXRlcicgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdHZhciB1cmwgPSB3cG1kYl9kYXRhLnRoaXNfZG93bmxvYWRfdXJsICsgZW5jb2RlVVJJQ29tcG9uZW50KCBkdW1wX2ZpbGVuYW1lICk7XG5cdFx0XHRcdFx0aWYgKCAkKCAnI2d6aXBfZmlsZScgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRcdFx0dXJsICs9ICcmZ3ppcD0xJztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0d2luZG93LmxvY2F0aW9uID0gdXJsO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdG1pZ3JhdGVfY29tcGxldGVfdGV4dCA9IHdwbWRiX3N0cmluZ3MuY29tcGxldGVkX2R1bXBfbG9jYXRlZF9hdCArICcgJyArIGR1bXBfcGF0aDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgKSB7XG5cblx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBjb21wbGV0ZWRfbXNnLCBtaWdyYXRlX2NvbXBsZXRlX3RleHQsICdjb21wbGV0ZScgKTtcblxuXHRcdFx0XHR9XG5cblx0XHRcdH0gZWxzZSB7IC8vIHJlbmFtZSB0ZW1wIHRhYmxlcywgZGVsZXRlIG9sZCB0YWJsZXNcblxuXHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggbnVsbCwgd3BtZGJfc3RyaW5ncy5maW5hbGl6aW5nX21pZ3JhdGlvbiwgJ2ZpbmFsaXppbmcnICk7XG5cblx0XHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfZmluYWxpemVfbWlncmF0aW9uJyxcblx0XHRcdFx0XHRcdG1pZ3JhdGlvbl9zdGF0ZV9pZDogd3BtZGIubWlncmF0aW9uX3N0YXRlX2lkLFxuXHRcdFx0XHRcdFx0cHJlZml4OiB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnByZWZpeCxcblx0XHRcdFx0XHRcdHRhYmxlczogdGFibGVzX3RvX21pZ3JhdGUuam9pbiggJywnICksXG5cdFx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuZmluYWxpemVfbWlncmF0aW9uXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIHdwbWRiX3N0cmluZ3MuZmluYWxpemVfdGFibGVzX3Byb2JsZW0sICdlcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0YWxlcnQoIGpxWEhSICsgJyA6ICcgKyB0ZXh0U3RhdHVzICsgJyA6ICcgKyBlcnJvclRocm93biApO1xuXHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm1pZ3JhdGlvbl9lcnJvciA9IHRydWU7XG5cdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH0sXG5cdFx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0XHRpZiAoICcxJyAhPT0gJC50cmltKCBkYXRhICkgKSB7XG5cdFx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIGRhdGEsICdlcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0d3BtZGIuY29tbW9uLm5leHRfc3RlcF9pbl9taWdyYXRpb24gPSB7IGZuOiB3cG1kYl9jYWxsX25leHRfaG9vayB9O1xuXHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHdwbWRiLmZ1bmN0aW9ucy53cG1kYl9mbHVzaCA9IGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAnc2F2ZWZpbGUnICE9PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRUZXh0KCB3cG1kYl9zdHJpbmdzLmZsdXNoaW5nICk7XG5cdFx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2ZsdXNoJyxcblx0XHRcdFx0XHRcdG1pZ3JhdGlvbl9zdGF0ZV9pZDogd3BtZGIubWlncmF0aW9uX3N0YXRlX2lkLFxuXHRcdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmZsdXNoXG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9mYWlsZWQsIHdwbWRiX3N0cmluZ3MuZmx1c2hfcHJvYmxlbSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRhbGVydCgganFYSFIgKyAnIDogJyArIHRleHRTdGF0dXMgKyAnIDogJyArIGVycm9yVGhyb3duICk7XG5cdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fSxcblx0XHRcdFx0XHRzdWNjZXNzOiBmdW5jdGlvbiggZGF0YSApIHtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdGlmICggJzEnICE9PSAkLnRyaW0oIGRhdGEgKSApIHtcblx0XHRcdFx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2ZhaWxlZCwgZGF0YSwgJ2Vycm9yJyApO1xuXG5cdFx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMubWlncmF0aW9uX2NvbXBsZXRlX2V2ZW50cygpO1xuXHRcdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHsgZm46IHdwbWRiX2NhbGxfbmV4dF9ob29rIH07XG5cdFx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdH1cblx0XHR9O1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLnVwZGF0ZV9taWdyYXRlX2J1dHRvbl90ZXh0ID0gZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbWlncmF0aW9uX2ludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cdFx0XHR2YXIgc2F2ZV9zdHJpbmcgPSAoICQoICcjc2F2ZS1taWdyYXRpb24tcHJvZmlsZScgKS5pcyggJzpjaGVja2VkJyApICkgPyAnX3NhdmUnIDogJyc7XG5cdFx0XHR2YXIgbWlncmF0ZV9zdHJpbmcgPSAnbWlncmF0ZV9idXR0b25fJyArICggKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkgPyAnZXhwb3J0JyA6IG1pZ3JhdGlvbl9pbnRlbnQgKSArIHNhdmVfc3RyaW5nO1xuXHRcdFx0JCggJy5taWdyYXRlLWRiIC5idXR0b24tcHJpbWFyeScgKS52YWwoIHdwbWRiX3N0cmluZ3NbIG1pZ3JhdGVfc3RyaW5nIF0gKTtcblx0XHR9O1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLnVwZGF0ZV9taWdyYXRlX2J1dHRvbl90ZXh0KCk7XG5cblx0XHQvLyBjbG9zZSBwcm9ncmVzcyBwb3AgdXAgb25jZSBtaWdyYXRpb24gaXMgY29tcGxldGVkXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcuY2xvc2UtcHJvZ3Jlc3MtY29udGVudC1idXR0b24nLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGhpZGVfb3ZlcmxheSgpO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ucmVzdG9yZVRpdGxlRWxlbSgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnI292ZXJsYXknLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX2NvbXBsZXRlZCAmJiBlLnRhcmdldCA9PT0gdGhpcyApIHtcblx0XHRcdFx0aGlkZV9vdmVybGF5KCk7XG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnJlc3RvcmVUaXRsZUVsZW0oKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBoaWRlX292ZXJsYXkoKSB7XG5cdFx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlQ2xhc3MoICdzaG93JyApLmFkZENsYXNzKCAnaGlkZScgKTtcblx0XHRcdCQoICcjb3ZlcmxheSA+IGRpdicgKS5yZW1vdmVDbGFzcyggJ3Nob3cnICkuYWRkQ2xhc3MoICdoaWRlJyApO1xuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uJHByb1ZlcnNpb24uZmluZCggJ2lmcmFtZScgKS5yZW1vdmUoKTtcblx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI292ZXJsYXknICkucmVtb3ZlKCk7XG5cdFx0XHR9LCA1MDAgKTtcblx0XHRcdG1pZ3JhdGlvbl9jb21wbGV0ZWQgPSBmYWxzZTtcblx0XHR9XG5cblx0XHQvLyBBSkFYIHNhdmUgYnV0dG9uIHByb2ZpbGVcblx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLmNsaWNrKCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0aWYgKCAnJyA9PT0gJC50cmltKCAkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoKSApICYmICQoICcjY3JlYXRlX25ldycgKS5pcyggJzpjaGVja2VkJyApICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5lbnRlcl9uYW1lX2Zvcl9wcm9maWxlICk7XG5cdFx0XHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLmZvY3VzKCk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHNhdmVfYWN0aXZlX3Byb2ZpbGUoKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBzYXZlX2FjdGl2ZV9wcm9maWxlKCkge1xuXHRcdFx0dmFyIHByb2ZpbGU7XG5cdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLmJsdXIoKTtcblxuXHRcdFx0aWYgKCBkb2luZ19zYXZlX3Byb2ZpbGUgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0Ly8gY2hlY2sgdGhhdCB0aGV5J3ZlIHNlbGVjdGVkIHNvbWUgdGFibGVzIHRvIG1pZ3JhdGVcblx0XHRcdGlmICggJCggJyNtaWdyYXRlLXNlbGVjdGVkJyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtdGFibGVzJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZSApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdC8vIGNoZWNrIHRoYXQgdGhleSd2ZSBzZWxlY3RlZCBzb21lIHRhYmxlcyB0byBiYWNrdXBcblx0XHRcdGlmICggJ3NhdmVmaWxlJyAhPT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSAmJiAkKCAnI2JhY2t1cC1tYW51YWwtc2VsZWN0JyApLmlzKCAnOmNoZWNrZWQnICkgJiYgbnVsbCA9PT0gJCggJyNzZWxlY3QtYmFja3VwJyApLnZhbCgpICkge1xuXHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5wbGVhc2Vfc2VsZWN0X29uZV90YWJsZV9iYWNrdXAgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgY3JlYXRlX25ld19wcm9maWxlID0gZmFsc2U7XG5cblx0XHRcdGlmICggJCggJyNjcmVhdGVfbmV3JyApLmlzKCAnOmNoZWNrZWQnICkgKSB7XG5cdFx0XHRcdGNyZWF0ZV9uZXdfcHJvZmlsZSA9IHRydWU7XG5cdFx0XHR9XG5cdFx0XHR2YXIgcHJvZmlsZV9uYW1lID0gJCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCk7XG5cblx0XHRcdGRvaW5nX3NhdmVfcHJvZmlsZSA9IHRydWU7XG5cdFx0XHRwcm9maWxlID0gJCggJCggJyNtaWdyYXRlLWZvcm0nIClbMF0uZWxlbWVudHMgKS5ub3QoICcuYXV0aC1jcmVkZW50aWFscycgKS5zZXJpYWxpemUoKTtcblxuXHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnIClcblx0XHRcdFx0LmFmdGVyKCAnPGltZyBzcmM9XCInICsgc3Bpbm5lcl91cmwgKyAnXCIgYWx0PVwiXCIgY2xhc3M9XCJzYXZlLXByb2ZpbGUtYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JyApO1xuXG5cdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9zYXZlX3Byb2ZpbGUnLFxuXHRcdFx0XHRcdHByb2ZpbGU6IHByb2ZpbGUsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnNhdmVfcHJvZmlsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3Muc2F2ZV9wcm9maWxlX3Byb2JsZW0gKTtcblx0XHRcdFx0XHQkKCAnLnNhdmUtc2V0dGluZ3MtYnV0dG9uJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQkKCAnLnNhdmUtcHJvZmlsZS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5hZnRlciggJzxzcGFuIGNsYXNzPVwiYWpheC1zdWNjZXNzLW1zZ1wiPicgKyB3cG1kYl9zdHJpbmdzLnNhdmVkICsgJzwvc3Bhbj4nICk7XG5cdFx0XHRcdFx0JCggJy5hamF4LXN1Y2Nlc3MtbXNnJyApLmZhZGVPdXQoIDIwMDAsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdFx0JCggdGhpcyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0XHRkb2luZ19zYXZlX3Byb2ZpbGUgPSBmYWxzZTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0dmFyIHVwZGF0ZWRfcHJvZmlsZV9pZCA9IHBhcnNlSW50KCAkKCAnI21pZ3JhdGUtZm9ybSBpbnB1dFtuYW1lPXNhdmVfbWlncmF0aW9uX3Byb2ZpbGVfb3B0aW9uXTpjaGVja2VkJyApLnZhbCgpLCAxMCApICsgMTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXNldHRpbmdzLWJ1dHRvbicgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5zYXZlLXByb2ZpbGUtYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcuc2F2ZS1zZXR0aW5ncy1idXR0b24nICkuYWZ0ZXIoICc8c3BhbiBjbGFzcz1cImFqYXgtc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zdWNjZXNzLW1zZycgKS5mYWRlT3V0KCAyMDAwLCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdCQoIHRoaXMgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdFx0ZG9pbmdfc2F2ZV9wcm9maWxlID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCAnJyApO1xuXG5cdFx0XHRcdFx0aWYgKCBjcmVhdGVfbmV3X3Byb2ZpbGUgKSB7XG5cdFx0XHRcdFx0XHR2YXIgbmV3X3Byb2ZpbGVfa2V5ID0gcGFyc2VJbnQoIGRhdGEsIDEwICk7XG5cdFx0XHRcdFx0XHR2YXIgbmV3X3Byb2ZpbGVfaWQgPSBuZXdfcHJvZmlsZV9rZXkgKyAxO1xuXHRcdFx0XHRcdFx0dmFyIG5ld19saSA9ICQoICc8bGk+PHNwYW4gY2xhc3M9XCJkZWxldGUtcHJvZmlsZVwiIGRhdGEtcHJvZmlsZS1pZD1cIicgKyBuZXdfcHJvZmlsZV9pZCArICdcIj48L3NwYW4+PGxhYmVsIGZvcj1cInByb2ZpbGUtJyArIG5ld19wcm9maWxlX2lkICsgJ1wiPjxpbnB1dCBpZD1cInByb2ZpbGUtJyArIG5ld19wcm9maWxlX2lkICsgJ1wiIHZhbHVlPVwiJyArIG5ld19wcm9maWxlX2tleSArICdcIiBuYW1lPVwic2F2ZV9taWdyYXRpb25fcHJvZmlsZV9vcHRpb25cIiB0eXBlPVwicmFkaW9cIj48L2xhYmVsPjwvbGk+JyApO1xuXHRcdFx0XHRcdFx0bmV3X2xpLmZpbmQoICdsYWJlbCcgKS5hcHBlbmQoIGRvY3VtZW50LmNyZWF0ZVRleHROb2RlKCAnICcgKyBwcm9maWxlX25hbWUgKSApO1xuXHRcdFx0XHRcdFx0dXBkYXRlZF9wcm9maWxlX2lkID0gbmV3X3Byb2ZpbGVfaWQ7XG5cblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlX25ldycgKS5wYXJlbnRzKCAnbGknICkuYmVmb3JlKCBuZXdfbGkgKTtcblx0XHRcdFx0XHRcdCQoICcjcHJvZmlsZS0nICsgbmV3X3Byb2ZpbGVfaWQgKS5hdHRyKCAnY2hlY2tlZCcsICdjaGVja2VkJyApO1xuXHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdC8vIFB1c2ggdXBkYXRlZCBwcm9maWxlIGlkIHRvIGhpc3RvcnkgaWYgYXZhaWxhYmxlXG5cdFx0XHRcdFx0dmFyIHVwZGF0ZWRfdXJsID0gd2luZG93LmxvY2F0aW9uLmhyZWYucmVwbGFjZSggJyNtaWdyYXRlJywgJycgKS5yZXBsYWNlKCAvJndwbWRiLXByb2ZpbGU9LT9cXGQrLywgJycgKSArICcmd3BtZGItcHJvZmlsZT0nICsgdXBkYXRlZF9wcm9maWxlX2lkO1xuXHRcdFx0XHRcdHZhciB1cGRhdGVkX3Byb2ZpbGVfbmFtZSA9ICQoICcjbWlncmF0ZS1mb3JtIGlucHV0W25hbWU9c2F2ZV9taWdyYXRpb25fcHJvZmlsZV9vcHRpb25dOmNoZWNrZWQnICkucGFyZW50KCkudGV4dCgpLnRyaW0oKTtcblxuXHRcdFx0XHRcdGlmICggJ2Z1bmN0aW9uJyA9PT0gdHlwZW9mIHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSApIHtcblx0XHRcdFx0XHRcdGlmICggJCggJyNtaWdyYXRlLWZvcm0gLmNydW1icycgKS5sZW5ndGggKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcjbWlncmF0ZS1mb3JtIC5jcnVtYnMgLmNydW1iOmxhc3QnICkudGV4dCggdXBkYXRlZF9wcm9maWxlX25hbWUgKTtcblx0XHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHRcdHZhciAkY3J1bWJzID0gJCggJzxkaXYgY2xhc3M9XCJjcnVtYnNcIiAvPicgKVxuXHRcdFx0XHRcdFx0XHRcdC5hcHBlbmQoICc8YSBjbGFzcz1cImNydW1iXCIgaHJlZj1cIicgKyB3cG1kYl9kYXRhLnRoaXNfcGx1Z2luX2Jhc2UgKyAnXCI+IFNhdmVkIFByb2ZpbGVzIDwvYT4nIClcblx0XHRcdFx0XHRcdFx0XHQuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJjcnVtYlwiPicgKyB1cGRhdGVkX3Byb2ZpbGVfbmFtZSArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdFx0XHQkKCAnI21pZ3JhdGUtZm9ybScgKS5wcmVwZW5kKCAkY3J1bWJzICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR3aW5kb3cuaGlzdG9yeS5wdXNoU3RhdGUoIHsgdXBkYXRlZF9wcm9maWxlX2lkOiB1cGRhdGVkX3Byb2ZpbGVfaWQgfSwgbnVsbCwgdXBkYXRlZF91cmwgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9XG5cblx0XHQvLyBzYXZlIGZpbGUgKGV4cG9ydCkgLyBwdXNoIC8gcHVsbCBzcGVjaWFsIGNvbmRpdGlvbnNcblx0XHRmdW5jdGlvbiBtb3ZlX2Nvbm5lY3Rpb25faW5mb19ib3goKSB7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdCQoICcucHJlZml4LW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5kaWZmZXJlbnQtcGx1Z2luLXZlcnNpb24tbm90aWNlJyApLmhpZGUoKTtcblx0XHRcdCQoICcuc3RlcC10d28nICkuc2hvdygpO1xuXHRcdFx0JCggJy5iYWNrdXAtb3B0aW9ucycgKS5zaG93KCk7XG5cdFx0XHQkKCAnLmtlZXAtYWN0aXZlLXBsdWdpbnMnICkuc2hvdygpO1xuXHRcdFx0JCggJy5kaXJlY3RvcnktcGVybWlzc2lvbi1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJyNjcmVhdGUtYmFja3VwJyApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cC1sYWJlbCcgKS5yZW1vdmVDbGFzcyggJ2Rpc2FibGVkJyApO1xuXHRcdFx0JCggJy5iYWNrdXAtb3B0aW9uLWRpc2FibGVkJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29tcGF0aWJpbGl0eS1vbGRlci1teXNxbCcgKS5oaWRlKCk7XG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblx0XHRcdHZhciBwcm9maWxlX25hbWU7XG5cdFx0XHR3cG1kYl90b2dnbGVfbWlncmF0aW9uX2FjdGlvbl90ZXh0KCk7XG5cdFx0XHRpZiAoICdwdWxsJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSApIHtcblx0XHRcdFx0JCggJy5wdWxsLWxpc3QgbGknICkuYXBwZW5kKCAkY29ubmVjdGlvbl9pbmZvX2JveCApO1xuXHRcdFx0XHQkY29ubmVjdGlvbl9pbmZvX2JveC5zaG93KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHR2YXIgY29ubmVjdGlvbl90ZXh0YXJlYSA9ICQoIHRoaXMgKS5maW5kKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICk7XG5cdFx0XHRcdFx0aWYgKCAhY29ubmVjdGlvbl90ZXh0YXJlYS52YWwoKSApIHtcblx0XHRcdFx0XHRcdGNvbm5lY3Rpb25fdGV4dGFyZWEuZm9jdXMoKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gKTtcblx0XHRcdFx0aWYgKCBjb25uZWN0aW9uX2VzdGFibGlzaGVkICkge1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaGlkZSgpO1xuXHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuc2hvdygpO1xuXHRcdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucHJlZml4ICk7XG5cdFx0XHRcdFx0JCggJy51cGxvYWRzLWRpcicgKS5odG1sKCB3cG1kYl9kYXRhLnRoaXNfdXBsb2Fkc19kaXIgKTtcblx0XHRcdFx0XHRpZiAoIGZhbHNlID09PSBwcm9maWxlX25hbWVfZWRpdGVkICkge1xuXHRcdFx0XHRcdFx0cHJvZmlsZV9uYW1lID0gZ2V0X2RvbWFpbl9uYW1lKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnVybCApO1xuXHRcdFx0XHRcdFx0JCggJy5jcmVhdGUtbmV3LXByb2ZpbGUnICkudmFsKCBwcm9maWxlX25hbWUgKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3ByZWZpeF9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnByZWZpeC1ub3RpY2UucHVsbCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdGlmICggdHJ1ZSA9PT0gc2hvd19zc2xfbm90aWNlICkge1xuXHRcdFx0XHRcdFx0JCggJy5zc2wtbm90aWNlJyApLnNob3coKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3ZlcnNpb25fbm90aWNlICkge1xuXHRcdFx0XHRcdFx0JCggJy5kaWZmZXJlbnQtcGx1Z2luLXZlcnNpb24tbm90aWNlJyApLnNob3coKTtcblx0XHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuaGlkZSgpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHR3cG1kYl90b2dnbGVfbWlncmF0aW9uX2FjdGlvbl90ZXh0KCk7XG5cdFx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gd3BtZGJfZGF0YS53cml0ZV9wZXJtaXNzaW9uICkge1xuXHRcdFx0XHRcdFx0JCggJyNjcmVhdGUtYmFja3VwJyApLnByb3AoICdjaGVja2VkJywgZmFsc2UgKTtcblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cCcgKS5hdHRyKCAnZGlzYWJsZWQnLCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkKCAnI2NyZWF0ZS1iYWNrdXAtbGFiZWwnICkuYWRkQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLW9wdGlvbi1kaXNhYmxlZCcgKS5zaG93KCk7XG5cdFx0XHRcdFx0XHQkKCAnLnVwbG9hZC1kaXJlY3RvcnktbG9jYXRpb24nICkuaHRtbCggd3BtZGJfZGF0YS50aGlzX3VwbG9hZF9kaXJfbG9uZyApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLnNob3coKTtcblx0XHRcdFx0XHQkKCAnLnN0ZXAtdHdvJyApLmhpZGUoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSBlbHNlIGlmICggJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHQkKCAnLnB1c2gtbGlzdCBsaScgKS5hcHBlbmQoICRjb25uZWN0aW9uX2luZm9fYm94ICk7XG5cdFx0XHRcdCRjb25uZWN0aW9uX2luZm9fYm94LnNob3coIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdHZhciBjb25uZWN0aW9uX3RleHRhcmVhID0gJCggdGhpcyApLmZpbmQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKTtcblx0XHRcdFx0XHRpZiAoICFjb25uZWN0aW9uX3RleHRhcmVhLnZhbCgpICkge1xuXHRcdFx0XHRcdFx0Y29ubmVjdGlvbl90ZXh0YXJlYS5mb2N1cygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fSApO1xuXHRcdFx0XHRpZiAoIGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgKSB7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5oaWRlKCk7XG5cdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5zaG93KCk7XG5cdFx0XHRcdFx0JCggJy50YWJsZS1wcmVmaXgnICkuaHRtbCggd3BtZGJfZGF0YS50aGlzX3ByZWZpeCApO1xuXHRcdFx0XHRcdCQoICcudXBsb2Fkcy1kaXInICkuaHRtbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS51cGxvYWRzX2RpciApO1xuXHRcdFx0XHRcdGlmICggZmFsc2UgPT09IHByb2ZpbGVfbmFtZV9lZGl0ZWQgKSB7XG5cdFx0XHRcdFx0XHRwcm9maWxlX25hbWUgPSBnZXRfZG9tYWluX25hbWUoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXJsICk7XG5cdFx0XHRcdFx0XHQkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoIHByb2ZpbGVfbmFtZSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHNob3dfcHJlZml4X25vdGljZSApIHtcblx0XHRcdFx0XHRcdCQoICcucHJlZml4LW5vdGljZS5wdXNoJyApLnNob3coKTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG93X3NzbF9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuc2hvdygpO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRpZiAoIHRydWUgPT09IHNob3dfdmVyc2lvbl9ub3RpY2UgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmRpZmZlcmVudC1wbHVnaW4tdmVyc2lvbi1ub3RpY2UnICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHRcdHdwbWRiX3RvZ2dsZV9taWdyYXRpb25fYWN0aW9uX3RleHQoKTtcblx0XHRcdFx0XHRpZiAoICcwJyA9PT0gd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS53cml0ZV9wZXJtaXNzaW9ucyApIHtcblx0XHRcdFx0XHRcdCQoICcjY3JlYXRlLWJhY2t1cCcgKS5wcm9wKCAnY2hlY2tlZCcsIGZhbHNlICk7XG5cdFx0XHRcdFx0XHQkKCAnI2NyZWF0ZS1iYWNrdXAnICkuYXR0ciggJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyApO1xuXHRcdFx0XHRcdFx0JCggJyNjcmVhdGUtYmFja3VwLWxhYmVsJyApLmFkZENsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0XHQkKCAnLmJhY2t1cC1vcHRpb24tZGlzYWJsZWQnICkuc2hvdygpO1xuXHRcdFx0XHRcdFx0JCggJy51cGxvYWQtZGlyZWN0b3J5LWxvY2F0aW9uJyApLmh0bWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXBsb2FkX2Rpcl9sb25nICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXHRcdFx0XHRcdCQoICcuc3RlcC10d28nICkuaGlkZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9IGVsc2UgaWYgKCAnc2F2ZWZpbGUnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5zaG93KCk7XG5cdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIHdwbWRiX2RhdGEudGhpc19wcmVmaXggKTtcblx0XHRcdFx0JCggJy5jb21wYXRpYmlsaXR5LW9sZGVyLW15c3FsJyApLnNob3coKTtcblx0XHRcdFx0aWYgKCBmYWxzZSA9PT0gcHJvZmlsZV9uYW1lX2VkaXRlZCApIHtcblx0XHRcdFx0XHQkKCAnLmNyZWF0ZS1uZXctcHJvZmlsZScgKS52YWwoICcnICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JCggJy5iYWNrdXAtb3B0aW9ucycgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcua2VlcC1hY3RpdmUtcGx1Z2lucycgKS5oaWRlKCk7XG5cdFx0XHRcdGlmICggZmFsc2UgPT09IHdwbWRiX2RhdGEud3JpdGVfcGVybWlzc2lvbiApIHtcblx0XHRcdFx0XHQkKCAnLmRpcmVjdG9yeS1wZXJtaXNzaW9uLW5vdGljZScgKS5zaG93KCk7XG5cdFx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCk7XG5cdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ21vdmVfY29ubmVjdGlvbl9pbmZvX2JveCcsIHtcblx0XHRcdFx0J21pZ3JhdGlvbl90eXBlJzogd3BtZGJfbWlncmF0aW9uX3R5cGUoKSxcblx0XHRcdFx0J2xhc3RfbWlncmF0aW9uX3R5cGUnOiBsYXN0X3JlcGxhY2Vfc3dpdGNoXG5cdFx0XHR9ICk7XG5cdFx0fVxuXG5cdFx0Ly8gbW92ZSBhcm91bmQgdGV4dGFyZWEgZGVwZW5kaW5nIG9uIHdoZXRoZXIgb3Igbm90IHRoZSBwdXNoL3B1bGwgb3B0aW9ucyBhcmUgc2VsZWN0ZWRcblx0XHR2YXIgJGNvbm5lY3Rpb25faW5mb19ib3ggPSAkKCAnLmNvbm5lY3Rpb24taW5mby13cmFwcGVyJyApO1xuXHRcdG1vdmVfY29ubmVjdGlvbl9pbmZvX2JveCgpO1xuXG5cdFx0JCggJy5taWdyYXRlLXNlbGVjdGlvbi5vcHRpb24tZ3JvdXAgaW5wdXRbdHlwZT1yYWRpb10nICkuY2hhbmdlKCBmdW5jdGlvbigpIHtcblx0XHRcdG1vdmVfY29ubmVjdGlvbl9pbmZvX2JveCgpO1xuXHRcdFx0aWYgKCBjb25uZWN0aW9uX2VzdGFibGlzaGVkICkge1xuXHRcdFx0XHRjaGFuZ2VfcmVwbGFjZV92YWx1ZXMoKTtcblx0XHRcdH1cblx0XHRcdHdwbWRiLmZ1bmN0aW9ucy51cGRhdGVfbWlncmF0ZV9idXR0b25fdGV4dCgpO1xuXHRcdH0gKTtcblxuXHRcdGZ1bmN0aW9uIGNoYW5nZV9yZXBsYWNlX3ZhbHVlcygpIHtcblx0XHRcdHZhciBvbGRfdXJsID0gbnVsbDtcblx0XHRcdHZhciBvbGRfcGF0aCA9IG51bGw7XG5cdFx0XHRpZiAoIG51bGwgIT09IHdwbWRiLmNvbW1vbi5wcmV2aW91c19jb25uZWN0aW9uX2RhdGEgJiYgJ29iamVjdCcgPT09IHR5cGVvZiB3cG1kYi5jb21tb24ucHJldmlvdXNfY29ubmVjdGlvbl9kYXRhICYmIHdwbWRiLmNvbW1vbi5wcmV2aW91c19jb25uZWN0aW9uX2RhdGEudXJsICE9PSB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnVybCApIHtcblx0XHRcdFx0b2xkX3VybCA9IHJlbW92ZV9wcm90b2NvbCggd3BtZGIuY29tbW9uLnByZXZpb3VzX2Nvbm5lY3Rpb25fZGF0YS51cmwgKTtcblx0XHRcdFx0b2xkX3BhdGggPSB3cG1kYi5jb21tb24ucHJldmlvdXNfY29ubmVjdGlvbl9kYXRhLnBhdGg7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpIHx8ICdzYXZlZmlsZScgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgKSB7XG5cdFx0XHRcdGlmICggJ3B1bGwnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoICkge1xuXHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cnICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR2YXIgb2xkX3ZhbCA9ICQoICcub2xkLXJlcGxhY2UtY29sIGlucHV0JywgdGhpcyApLnZhbCgpO1xuXHRcdFx0XHRcdFx0JCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCAkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCgpICk7XG5cdFx0XHRcdFx0XHQkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCggb2xkX3ZhbCApO1xuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fSBlbHNlIGlmICggJ3B1c2gnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoICYmICdwdXNoJyA9PT0gd3BtZGJfbWlncmF0aW9uX3R5cGUoKSAmJiBudWxsICE9PSBvbGRfdXJsICYmIG51bGwgIT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cnICkuZWFjaCggZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHR2YXIgb2xkX3ZhbCA9ICQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLnJlcGxhY2UtcmlnaHQtY29sIGlucHV0JywgdGhpcyApLnZhbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS5wYXRoICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF91cmwgKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCByZW1vdmVfcHJvdG9jb2woIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9ICk7XG5cdFx0XHRcdH1cblx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVzaF90YWJsZV9zZWxlY3QnICk7XG5cdFx0XHRcdCQoICcjc2VsZWN0LXBvc3QtdHlwZXMnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuZXhjbHVkZS1wb3N0LXR5cGVzLXdhcm5pbmcnICkuYWZ0ZXIoICRwdXNoX3Bvc3RfdHlwZV9zZWxlY3QgKTtcblx0XHRcdFx0ZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKTtcblx0XHRcdFx0JCggJyNzZWxlY3QtYmFja3VwJyApLnJlbW92ZSgpO1xuXHRcdFx0XHQkKCAnLmJhY2t1cC10YWJsZXMtd3JhcCcgKS5wcmVwZW5kKCAkcHVzaF9zZWxlY3RfYmFja3VwICk7XG5cdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgKSB7XG5cdFx0XHRcdGlmICggJycgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggfHwgJ3B1c2gnID09PSBsYXN0X3JlcGxhY2Vfc3dpdGNoIHx8ICdzYXZlZmlsZScgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggKSB7XG5cdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdycgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHZhciBvbGRfdmFsID0gJCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoICQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCkgKTtcblx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yaWdodC1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCBvbGRfdmFsICk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IGxhc3RfcmVwbGFjZV9zd2l0Y2ggJiYgJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICYmIG51bGwgIT09IG9sZF91cmwgJiYgbnVsbCAhPT0gb2xkX3BhdGggKSB7XG5cdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdycgKS5lYWNoKCBmdW5jdGlvbigpIHtcblx0XHRcdFx0XHRcdHZhciBvbGRfdmFsID0gJCggJy5vbGQtcmVwbGFjZS1jb2wgaW5wdXQnLCB0aGlzICkudmFsKCk7XG5cdFx0XHRcdFx0XHRpZiAoIG9sZF92YWwgPT09IG9sZF9wYXRoICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoIHdwbWRiLmNvbW1vbi5jb25uZWN0aW9uX2RhdGEucGF0aCApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0aWYgKCBvbGRfdmFsID09PSBvbGRfdXJsICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcsIHRoaXMgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YS51cmwgKSApO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdH0gKTtcblx0XHRcdFx0fVxuXHRcdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX3VwZGF0ZV9wdWxsX3RhYmxlX3NlbGVjdCcgKTtcblx0XHRcdFx0JCggJyNzZWxlY3QtcG9zdC10eXBlcycgKS5yZW1vdmUoKTtcblx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5hZnRlciggJHB1bGxfcG9zdF90eXBlX3NlbGVjdCApO1xuXHRcdFx0XHRleGNsdWRlX3Bvc3RfdHlwZXNfd2FybmluZygpO1xuXHRcdFx0XHQkKCAnI3NlbGVjdC1iYWNrdXAnICkucmVtb3ZlKCk7XG5cdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdWxsX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdH1cblx0XHRcdGxhc3RfcmVwbGFjZV9zd2l0Y2ggPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXHRcdH1cblxuXHRcdC8vIGhpZGUgc2Vjb25kIHNlY3Rpb24gaWYgcHVsbCBvciBwdXNoIGlzIHNlbGVjdGVkIHdpdGggbm8gY29ubmVjdGlvbiBlc3RhYmxpc2hlZFxuXHRcdGlmICggKCAncHVsbCcgPT09IHdwbWRiX21pZ3JhdGlvbl90eXBlKCkgfHwgJ3B1c2gnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkgJiYgIWNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgKSB7XG5cdFx0XHQkKCAnLnN0ZXAtdHdvJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXHRcdH1cblxuXHRcdC8vIHNob3cgLyBoaWRlIEdVSUQgaGVscGVyIGRlc2NyaXB0aW9uXG5cdFx0JCggJy5nZW5lcmFsLWhlbHBlcicgKS5jbGljayggZnVuY3Rpb24oIGUgKSB7XG5cdFx0XHRlLnByZXZlbnREZWZhdWx0KCk7XG5cdFx0XHR2YXIgaWNvbiA9ICQoIHRoaXMgKSxcblx0XHRcdFx0YnViYmxlID0gJCggdGhpcyApLm5leHQoKTtcblxuXHRcdFx0Ly8gQ2xvc2UgYW55IHRoYXQgYXJlIGFscmVhZHkgb3BlblxuXHRcdFx0JCggJy5oZWxwZXItbWVzc2FnZScgKS5ub3QoIGJ1YmJsZSApLmhpZGUoKTtcblxuXHRcdFx0dmFyIHBvc2l0aW9uID0gaWNvbi5wb3NpdGlvbigpO1xuXHRcdFx0aWYgKCBidWJibGUuaGFzQ2xhc3MoICdib3R0b20nICkgKSB7XG5cdFx0XHRcdGJ1YmJsZS5jc3MoIHtcblx0XHRcdFx0XHQnbGVmdCc6ICggcG9zaXRpb24ubGVmdCAtIGJ1YmJsZS53aWR0aCgpIC8gMiApICsgJ3B4Jyxcblx0XHRcdFx0XHQndG9wJzogKCBwb3NpdGlvbi50b3AgKyBpY29uLmhlaWdodCgpICsgOSApICsgJ3B4J1xuXHRcdFx0XHR9ICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRidWJibGUuY3NzKCB7XG5cdFx0XHRcdFx0J2xlZnQnOiAoIHBvc2l0aW9uLmxlZnQgKyBpY29uLndpZHRoKCkgKyA5ICkgKyAncHgnLFxuXHRcdFx0XHRcdCd0b3AnOiAoIHBvc2l0aW9uLnRvcCArIGljb24uaGVpZ2h0KCkgLyAyIC0gMTggKSArICdweCdcblx0XHRcdFx0fSApO1xuXHRcdFx0fVxuXG5cdFx0XHRidWJibGUudG9nZ2xlKCk7XG5cdFx0XHRlLnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLmNsaWNrKCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuaGVscGVyLW1lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuaGVscGVyLW1lc3NhZ2UnICkuY2xpY2soIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5zdG9wUHJvcGFnYXRpb24oKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5zaG93LWVycm9ycy10b2dnbGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGUucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoIHRoaXMgKS5uZXh0KCAnLm1pZ3JhdGlvbi1waHAtZXJyb3JzJyApLnRvZ2dsZSgpO1xuXHRcdH0gKTtcblxuXHRcdC8qKlxuXHRcdCAqIENvcmUgcGx1Z2luIHdyYXBwZXIgZm9yIHRoZSBjb21tb24gQUpBWCBlcnJvciBkZXRlY3RpbmcgbWV0aG9kXG5cdFx0ICpcblx0XHQgKiBAcGFyYW0gdGV4dFxuXHRcdCAqIEBwYXJhbSBjb2RlXG5cdFx0ICogQHBhcmFtIGpxWEhSXG5cdFx0ICpcblx0XHQgKiBAcmV0dXJucyB7c3RyaW5nfVxuXHRcdCAqL1xuXHRcdGZ1bmN0aW9uIGdldF9hamF4X2Vycm9ycyggdGV4dCwgY29kZSwganFYSFIgKSB7XG5cdFx0XHRyZXR1cm4gd3BtZGJHZXRBamF4RXJyb3JzKCB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25fbG9jYWxfc2VydmVyX3Byb2JsZW0sIGNvZGUsIHRleHQsIGpxWEhSICk7XG5cdFx0fVxuXG5cdFx0Ly8gbWlncmF0ZSAvIHNldHRpbmdzIHRhYnNcblx0XHQkKCAnLm5hdi10YWInICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhhc2ggPSAkKCB0aGlzICkuYXR0ciggJ2RhdGEtZGl2LW5hbWUnICk7XG5cdFx0XHRoYXNoID0gaGFzaC5yZXBsYWNlKCAnLXRhYicsICcnICk7XG5cdFx0XHR3aW5kb3cubG9jYXRpb24uaGFzaCA9IGhhc2g7XG5cdFx0XHRzd2l0Y2hfdG9fcGx1Z2luX3RhYiggaGFzaCwgZmFsc2UgKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJ2FbaHJlZl49XCIjXCJdJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0dmFyIGhyZWYgPSAkKCBldmVudC50YXJnZXQgKS5hdHRyKCAnaHJlZicgKTtcblx0XHRcdHZhciB0YWJfbmFtZSA9IGhyZWYuc3Vic3RyKCAxICk7XG5cblx0XHRcdGlmICggdGFiX25hbWUgKSB7XG5cdFx0XHRcdHZhciBuYXZfdGFiID0gJCggJy4nICsgdGFiX25hbWUgKTtcblx0XHRcdFx0aWYgKCAxID09PSBuYXZfdGFiLmxlbmd0aCApIHtcblx0XHRcdFx0XHRuYXZfdGFiLnRyaWdnZXIoICdjbGljaycgKTtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0Ly8gcmVwZWF0YWJsZSBmaWVsZHNcblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5hZGQtcm93JywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgJHBhcmVudF90ciA9ICQoIHRoaXMgKS5wYXJlbnRzKCAndHInICk7XG5cdFx0XHQkcGFyZW50X3RyLmJlZm9yZSggJCggJy5vcmlnaW5hbC1yZXBlYXRhYmxlLWZpZWxkJyApLmNsb25lKCkucmVtb3ZlQ2xhc3MoICdvcmlnaW5hbC1yZXBlYXRhYmxlLWZpZWxkJyApICk7XG5cdFx0XHQkcGFyZW50X3RyLnByZXYoKS5maW5kKCAnLm9sZC1yZXBsYWNlLWNvbCBpbnB1dCcgKS5mb2N1cygpO1xuXHRcdH0gKTtcblxuXHRcdC8vIHJlcGVhdGFibGUgZmllbGRzXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcucmVwbGFjZS1yZW1vdmUtcm93JywgZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50cyggJ3RyJyApLnJlbW92ZSgpO1xuXHRcdFx0aWYgKCAyID49ICQoICcucmVwbGFjZS1yb3cnICkubGVuZ3RoICkge1xuXHRcdFx0XHQkKCAnLm5vLXJlcGxhY2VzLW1lc3NhZ2UnICkuc2hvdygpO1xuXHRcdFx0fVxuXG5cdFx0XHR2YXIgcHJldl9pZCA9ICQoIHRoaXMgKS5wcmV2KCkuYXR0ciggJ2lkJyApO1xuXHRcdFx0aWYgKCAnbmV3LXVybCcgPT09IHByZXZfaWQgfHwgJ25ldy1wYXRoJyA9PT0gcHJldl9pZCApIHtcblx0XHRcdFx0JCggJyMnICsgcHJldl9pZCArICctbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyBIaWRlIE5ldyBVUkwgJiBOZXcgUGF0aCBXYXJuaW5ncyBvbiBjaGFuZ2UuXG5cdFx0JCggJ2JvZHknIClcblx0XHRcdC5vbiggJ2NoYW5nZScsICcjbmV3LXVybCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI25ldy11cmwtbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblx0XHRcdH0gKVxuXHRcdFx0Lm9uKCAnY2hhbmdlJywgJyNuZXctcGF0aCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9ICk7XG5cblx0XHQvLyBDb3B5IEZpbmQgZmllbGQgdG8gYXNzb2NpYXRlZCBSZXBsYWNlIGZpZWxkIG9uIGFycm93IGNsaWNrLlxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmFycm93LWNvbCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIHJlcGxhY2Vfcm93X2Fycm93ID0gdGhpcztcblxuXHRcdFx0aWYgKCAkKCByZXBsYWNlX3Jvd19hcnJvdyApLmhhc0NsYXNzKCAnZGlzYWJsZWQnICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0dmFyIG9yaWdpbmFsX3ZhbHVlID0gJCggcmVwbGFjZV9yb3dfYXJyb3cgKS5wcmV2KCAndGQnICkuZmluZCggJ2lucHV0JyApLnZhbCgpO1xuXHRcdFx0dmFyIG5ld192YWx1ZV9pbnB1dCA9ICQoIHJlcGxhY2Vfcm93X2Fycm93ICkubmV4dCggJ3RkJyApLmZpbmQoICdpbnB1dCcgKTtcblx0XHRcdG5ld192YWx1ZV9pbnB1dC52YWwoIG9yaWdpbmFsX3ZhbHVlICk7XG5cblx0XHRcdC8vIEhpZGUgTmV3IFVSTCBvciBOZXcgUGF0aCBXYXJuaW5nIGlmIGNoYW5nZWQuXG5cdFx0XHRpZiAoICduZXctdXJsJyA9PT0gbmV3X3ZhbHVlX2lucHV0LnByb3AoICdpZCcgKSApIHtcblx0XHRcdFx0JCggJyNuZXctdXJsLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9IGVsc2UgaWYgKCAnbmV3LXBhdGgnID09PSBuZXdfdmFsdWVfaW5wdXQucHJvcCggJ2lkJyApICkge1xuXHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZycgKS5oaWRlKCk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdFx0JCggJy5hZGQtcmVwbGFjZScgKS5jbGljayggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCAnLnJlcGxhY2UtZmllbGRzJyApLnByZXBlbmQoICQoICcub3JpZ2luYWwtcmVwZWF0YWJsZS1maWVsZCcgKS5jbG9uZSgpLnJlbW92ZUNsYXNzKCAnb3JpZ2luYWwtcmVwZWF0YWJsZS1maWVsZCcgKSApO1xuXHRcdFx0JCggJy5uby1yZXBsYWNlcy1tZXNzYWdlJyApLmhpZGUoKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnI2ZpbmQtYW5kLXJlcGxhY2Utc29ydCB0Ym9keScgKS5zb3J0YWJsZSgge1xuXHRcdFx0aXRlbXM6ICc+IHRyOm5vdCgucGluKScsXG5cdFx0XHRoYW5kbGU6ICd0ZDpmaXJzdCcsXG5cdFx0XHRzdGFydDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy13ZWJraXQtZ3JhYmJpbmcnICk7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy1tb3otZ3JhYmJpbmcnICk7XG5cdFx0XHR9LFxuXHRcdFx0c3RvcDogZnVuY3Rpb24oKSB7XG5cdFx0XHRcdCQoICcuc29ydC1oYW5kbGUnICkuY3NzKCAnY3Vyc29yJywgJy13ZWJraXQtZ3JhYicgKTtcblx0XHRcdFx0JCggJy5zb3J0LWhhbmRsZScgKS5jc3MoICdjdXJzb3InLCAnLW1vei1ncmFiJyApO1xuXHRcdFx0fVxuXHRcdH0gKTtcblxuXHRcdGZ1bmN0aW9uIHZhbGlkYXRlX3VybCggdXJsICkge1xuXHRcdFx0cmV0dXJuIC9eKFthLXpdKFthLXpdfFxcZHxcXCt8LXxcXC4pKik6KFxcL1xcLygoKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6KSpAKT8oKFxcWyh8KHZbXFxkYS1mXXsxLH1cXC4oKFthLXpdfFxcZHwtfFxcLnxffH4pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDopKykpXFxdKXwoKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKVxcLihcXGR8WzEtOV1cXGR8MVxcZFxcZHwyWzAtNF1cXGR8MjVbMC01XSlcXC4oXFxkfFsxLTldXFxkfDFcXGRcXGR8MlswLTRdXFxkfDI1WzAtNV0pXFwuKFxcZHxbMS05XVxcZHwxXFxkXFxkfDJbMC00XVxcZHwyNVswLTVdKSl8KChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XSkqKSg6XFxkKik/KShcXC8oKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSp8KFxcLygoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkrKFxcLygoW2Etel18XFxkfC18XFwufF98fnxbXFx1MDBBMC1cXHVEN0ZGXFx1RjkwMC1cXHVGRENGXFx1RkRGMC1cXHVGRkVGXSl8KCVbXFxkYS1mXXsyfSl8WyFcXCQmJ1xcKFxcKVxcKlxcKyw7PV18OnxAKSopKik/KXwoKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApKyhcXC8oKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkqKSopfCgoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCkpezB9KShcXD8oKChbYS16XXxcXGR8LXxcXC58X3x+fFtcXHUwMEEwLVxcdUQ3RkZcXHVGOTAwLVxcdUZEQ0ZcXHVGREYwLVxcdUZGRUZdKXwoJVtcXGRhLWZdezJ9KXxbIVxcJCYnXFwoXFwpXFwqXFwrLDs9XXw6fEApfFtcXHVFMDAwLVxcdUY4RkZdfFxcL3xcXD8pKik/KFxcIygoKFthLXpdfFxcZHwtfFxcLnxffH58W1xcdTAwQTAtXFx1RDdGRlxcdUY5MDAtXFx1RkRDRlxcdUZERjAtXFx1RkZFRl0pfCglW1xcZGEtZl17Mn0pfFshXFwkJidcXChcXClcXCpcXCssOz1dfDp8QCl8XFwvfFxcPykqKT8kL2kudGVzdCggdXJsICk7XG5cdFx0fVxuXG5cdFx0ZnVuY3Rpb24gc3dpdGNoX3RvX3BsdWdpbl90YWIoIGhhc2gsIHNraXBfYWRkb25zX2NoZWNrICkge1xuXHRcdFx0JCggJy5uYXYtdGFiJyApLnJlbW92ZUNsYXNzKCAnbmF2LXRhYi1hY3RpdmUnICk7XG5cdFx0XHQkKCAnLm5hdi10YWIuJyArIGhhc2ggKS5hZGRDbGFzcyggJ25hdi10YWItYWN0aXZlJyApO1xuXHRcdFx0JCggJy5jb250ZW50LXRhYicgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLicgKyBoYXNoICsgJy10YWInICkuc2hvdygpO1xuXG5cdFx0XHRpZiAoICdzZXR0aW5ncycgPT09IGhhc2ggKSB7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gc2hvdWxkX2NoZWNrX2xpY2VuY2UoKSApIHtcblx0XHRcdFx0XHQkKCAncC5saWNlbmNlLXN0YXR1cycgKS5hcHBlbmQoICdDaGVja2luZyBMaWNlbnNlLi4uICcgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0XHRcdGNoZWNrX2xpY2VuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICdoZWxwJyA9PT0gaGFzaCApIHtcblx0XHRcdFx0cmVmcmVzaF9kZWJ1Z19sb2coKTtcblx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG91bGRfY2hlY2tfbGljZW5jZSgpICkge1xuXHRcdFx0XHRcdCQoICcuc3VwcG9ydC1jb250ZW50IHAnICkuYXBwZW5kKCBhamF4X3NwaW5uZXIgKTtcblx0XHRcdFx0XHRjaGVja19saWNlbmNlKCk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0aWYgKCAnYWRkb25zJyA9PT0gaGFzaCAmJiB0cnVlICE9PSBza2lwX2FkZG9uc19jaGVjayApIHtcblx0XHRcdFx0aWYgKCB0cnVlID09PSBzaG91bGRfY2hlY2tfbGljZW5jZSgpICkge1xuXHRcdFx0XHRcdCQoICcuYWRkb25zLWNvbnRlbnQgcCcgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXHRcdFx0XHRcdGNoZWNrX2xpY2VuY2UoKTtcblx0XHRcdFx0fVxuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGZ1bmN0aW9uIHNob3VsZF9jaGVja19saWNlbmNlKCkge1xuXHRcdFx0aWYgKCBmYWxzZSA9PT0gY2hlY2tlZF9saWNlbmNlICYmICcxJyA9PT0gd3BtZGJfZGF0YS5oYXNfbGljZW5jZSAmJiAndHJ1ZScgPT09IHdwbWRiX2RhdGEuaXNfcHJvICkge1xuXHRcdFx0XHRyZXR1cm4gdHJ1ZTtcblx0XHRcdH1cblx0XHRcdHJldHVybiBmYWxzZTtcblx0XHR9XG5cblx0XHR2YXIgaGFzaCA9ICcnO1xuXG5cdFx0Ly8gY2hlY2sgZm9yIGhhc2ggaW4gdXJsIChzZXR0aW5ncyB8fCBtaWdyYXRlKSBzd2l0Y2ggdGFicyBhY2NvcmRpbmdseVxuXHRcdGlmICggd2luZG93LmxvY2F0aW9uLmhhc2ggKSB7XG5cdFx0XHRoYXNoID0gd2luZG93LmxvY2F0aW9uLmhhc2guc3Vic3RyaW5nKCAxICk7XG5cdFx0XHRzd2l0Y2hfdG9fcGx1Z2luX3RhYiggaGFzaCwgZmFsc2UgKTtcblx0XHR9XG5cblx0XHRpZiAoICcnICE9PSBnZXRfcXVlcnlfdmFyKCAnaW5zdGFsbC1wbHVnaW4nICkgKSB7XG5cdFx0XHRoYXNoID0gJ2FkZG9ucyc7XG5cdFx0XHRjaGVja2VkX2xpY2VuY2UgPSB0cnVlO1xuXHRcdFx0c3dpdGNoX3RvX3BsdWdpbl90YWIoIGhhc2gsIHRydWUgKTtcblx0XHR9XG5cblx0XHQvLyBwcm9jZXNzIG5vdGljZSBsaW5rcyBjbGlja3MsIGVnLiBkaXNtaXNzLCByZW1pbmRlclxuXHRcdCQoICcubm90aWNlLWxpbmsnICkuY2xpY2soIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0JCggdGhpcyApLmNsb3Nlc3QoICcuaW5saW5lLW1lc3NhZ2UnICkuaGlkZSgpO1xuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9wcm9jZXNzX25vdGljZV9saW5rJyxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMucHJvY2Vzc19ub3RpY2VfbGluayxcblx0XHRcdFx0XHRub3RpY2U6ICQoIHRoaXMgKS5kYXRhKCAnbm90aWNlJyApLFxuXHRcdFx0XHRcdHR5cGU6ICQoIHRoaXMgKS5kYXRhKCAndHlwZScgKSxcblx0XHRcdFx0XHRyZW1pbmRlcjogJCggdGhpcyApLmRhdGEoICdyZW1pbmRlcicgKVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gcmVnZW5lcmF0ZXMgdGhlIHNhdmVkIHNlY3JldCBrZXlcblx0XHQkKCAnLnJlc2V0LWFwaS1rZXknICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFuc3dlciA9IGNvbmZpcm0oIHdwbWRiX3N0cmluZ3MucmVzZXRfYXBpX2tleSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgfHwgZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdGRvaW5nX3Jlc2V0X2FwaV9rZXlfYWpheCA9IHRydWU7XG5cdFx0XHQkKCAnLnJlc2V0LWFwaS1rZXknICkuYWZ0ZXIoICc8aW1nIHNyYz1cIicgKyBzcGlubmVyX3VybCArICdcIiBhbHQ9XCJcIiBjbGFzcz1cInJlc2V0LWFwaS1rZXktYWpheC1zcGlubmVyIGdlbmVyYWwtc3Bpbm5lclwiIC8+JyApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3Jlc2V0X2FwaV9rZXknLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5yZXNldF9hcGlfa2V5XG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnJlc2V0X2FwaV9rZXlfcHJvYmxlbSApO1xuXHRcdFx0XHRcdCQoICcucmVzZXQtYXBpLWtleS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcucmVzZXQtYXBpLWtleS1hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfcmVzZXRfYXBpX2tleV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLWluZm8nICkuaHRtbCggZGF0YSApO1xuXHRcdFx0XHRcdHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCBkYXRhICkuc3BsaXQoICdcXG4nICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdH0gKTtcblxuXHRcdC8vIHNob3cgLyBoaWRlIHRhYmxlIHNlbGVjdCBib3ggd2hlbiBzcGVjaWZpYyBzZXR0aW5ncyBjaGFuZ2Vcblx0XHQkKCAnaW5wdXQubXVsdGlzZWxlY3QtdG9nZ2xlJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHQkKCB0aGlzICkucGFyZW50cyggJy5leHBhbmRhYmxlLWNvbnRlbnQnICkuY2hpbGRyZW4oICcuc2VsZWN0LXdyYXAnICkudG9nZ2xlKCk7XG5cdFx0fSApO1xuXG5cdFx0JCggJy5zaG93LW11bHRpc2VsZWN0JyApLmVhY2goIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCAkKCB0aGlzICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdFx0JCggdGhpcyApLnBhcmVudHMoICcub3B0aW9uLXNlY3Rpb24nICkuY2hpbGRyZW4oICcuaGVhZGVyLWV4cGFuZC1jb2xsYXBzZScgKS5jaGlsZHJlbiggJy5leHBhbmQtY29sbGFwc2UtYXJyb3cnICkucmVtb3ZlQ2xhc3MoICdjb2xsYXBzZWQnICk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnRzKCAnLmV4cGFuZGFibGUtY29udGVudCcgKS5zaG93KCk7XG5cdFx0XHRcdCQoIHRoaXMgKS5wYXJlbnRzKCAnLmV4cGFuZGFibGUtY29udGVudCcgKS5jaGlsZHJlbiggJy5zZWxlY3Qtd3JhcCcgKS50b2dnbGUoKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQkKCAnaW5wdXRbbmFtZT1iYWNrdXBfb3B0aW9uXScgKS5jaGFuZ2UoIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5iYWNrdXAtdGFibGVzLXdyYXAnICkuaGlkZSgpO1xuXHRcdFx0aWYgKCAnYmFja3VwX21hbnVhbF9zZWxlY3QnID09PSAkKCB0aGlzICkudmFsKCkgKSB7XG5cdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnNob3coKTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHRpZiAoICQoICcjYmFja3VwLW1hbnVhbC1zZWxlY3QnICkuaXMoICc6Y2hlY2tlZCcgKSApIHtcblx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnNob3coKTtcblx0XHR9XG5cblx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXNhdmUnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0aWYgKCBkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ICkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHQkKCB0aGlzICkuYWRkQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdHZhciBzZWxlY3RfZWxlbWVudCA9ICQoICcjc2VsZWN0ZWQtcGx1Z2lucycgKTtcblx0XHRcdCQoIHNlbGVjdF9lbGVtZW50ICkuYXR0ciggJ2Rpc2FibGVkJywgJ2Rpc2FibGVkJyApO1xuXG5cdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXN1Y2Nlc3MtbXNnJyApLnJlbW92ZSgpO1xuXG5cdFx0XHRkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ID0gdHJ1ZTtcblx0XHRcdCQoIHRoaXMgKS5hZnRlciggJzxpbWcgc3JjPVwiJyArIHNwaW5uZXJfdXJsICsgJ1wiIGFsdD1cIlwiIGNsYXNzPVwicGx1Z2luLWNvbXBhdGliaWxpdHktc3Bpbm5lciBnZW5lcmFsLXNwaW5uZXJcIiAvPicgKTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ3RleHQnLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl9ibGFja2xpc3RfcGx1Z2lucycsXG5cdFx0XHRcdFx0YmxhY2tsaXN0X3BsdWdpbnM6ICQoIHNlbGVjdF9lbGVtZW50ICkudmFsKClcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MuYmxhY2tsaXN0X3Byb2JsZW0gKyAnXFxyXFxuXFxyXFxuJyArIHdwbWRiX3N0cmluZ3Muc3RhdHVzICsgJyAnICsganFYSFIuc3RhdHVzICsgJyAnICsganFYSFIuc3RhdHVzVGV4dCArICdcXHJcXG5cXHJcXG4nICsgd3BtZGJfc3RyaW5ncy5yZXNwb25zZSArICdcXHJcXG4nICsganFYSFIucmVzcG9uc2VUZXh0ICk7XG5cdFx0XHRcdFx0JCggc2VsZWN0X2VsZW1lbnQgKS5yZW1vdmVBdHRyKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0JCggJy5wbHVnaW4tY29tcGF0aWJpbGl0eS1zYXZlJyApLnJlbW92ZUNsYXNzKCAnZGlzYWJsZWQnICk7XG5cdFx0XHRcdFx0ZG9pbmdfcGx1Z2luX2NvbXBhdGliaWxpdHlfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCAnJyAhPT0gJC50cmltKCBkYXRhICkgKSB7XG5cdFx0XHRcdFx0XHRhbGVydCggZGF0YSApO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHQkKCBzZWxlY3RfZWxlbWVudCApLnJlbW92ZUF0dHIoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHQkKCAnLnBsdWdpbi1jb21wYXRpYmlsaXR5LXNhdmUnICkucmVtb3ZlQ2xhc3MoICdkaXNhYmxlZCcgKTtcblx0XHRcdFx0XHRkb2luZ19wbHVnaW5fY29tcGF0aWJpbGl0eV9hamF4ID0gZmFsc2U7XG5cdFx0XHRcdFx0JCggJy5wbHVnaW4tY29tcGF0aWJpbGl0eS1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc2F2ZScgKS5hZnRlciggJzxzcGFuIGNsYXNzPVwicGx1Z2luLWNvbXBhdGliaWxpdHktc3VjY2Vzcy1tc2dcIj4nICsgd3BtZGJfc3RyaW5ncy5zYXZlZCArICc8L3NwYW4+JyApO1xuXHRcdFx0XHRcdCQoICcucGx1Z2luLWNvbXBhdGliaWxpdHktc3VjY2Vzcy1tc2cnICkuZmFkZU91dCggMjAwMCApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gZGVsZXRlIGEgcHJvZmlsZSBmcm9tIHRoZSBtaWdyYXRlIGZvcm0gYXJlYVxuXHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmRlbGV0ZS1wcm9maWxlJywgZnVuY3Rpb24oKSB7XG5cdFx0XHR2YXIgbmFtZSA9ICQoIHRoaXMgKS5uZXh0KCkuY2xvbmUoKTtcblx0XHRcdCQoICdpbnB1dCcsIG5hbWUgKS5yZW1vdmUoKTtcblx0XHRcdG5hbWUgPSAkLnRyaW0oICQoIG5hbWUgKS5odG1sKCkgKTtcblx0XHRcdHZhciBhbnN3ZXIgPSBjb25maXJtKCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlLnJlcGxhY2UoICd7e3Byb2ZpbGV9fScsIG5hbWUgKSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciAkcHJvZmlsZV9saSA9ICQoIHRoaXMgKS5wYXJlbnQoKTtcblxuXHRcdFx0aWYgKCAkcHJvZmlsZV9saS5maW5kKCAnaW5wdXQ6Y2hlY2tlZCcgKS5sZW5ndGggKSB7XG5cdFx0XHRcdHZhciAkbmV3X3Byb2ZpbGVfbGkgPSAkcHJvZmlsZV9saS5zaWJsaW5ncygpLmxhc3QoKTtcblx0XHRcdFx0JG5ld19wcm9maWxlX2xpLmZpbmQoICdpbnB1dFt0eXBlPXJhZGlvXScgKS5wcm9wKCAnY2hlY2tlZCcsICdjaGVja2VkJyApO1xuXHRcdFx0XHQkbmV3X3Byb2ZpbGVfbGkuZmluZCggJ2lucHV0W3R5cGU9dGV4dF0nICkuZm9jdXMoKTtcblx0XHRcdFx0JCggJyNtaWdyYXRlLWZvcm0gLmNydW1icyAuY3J1bWI6bGFzdCcgKS50ZXh0KCAnTmV3IFByb2ZpbGUnICk7XG5cblx0XHRcdFx0aWYgKCAnZnVuY3Rpb24nID09PSB0eXBlb2Ygd2luZG93Lmhpc3RvcnkucHVzaFN0YXRlICkge1xuXHRcdFx0XHRcdHZhciB1cGRhdGVkX3VybCA9IHdpbmRvdy5sb2NhdGlvbi5ocmVmLnJlcGxhY2UoICcjbWlncmF0ZScsICcnICkucmVwbGFjZSggLyZ3cG1kYi1wcm9maWxlPS0/XFxkKy8sICcnICkgKyAnJndwbWRiLXByb2ZpbGU9LTEnO1xuXHRcdFx0XHRcdHdpbmRvdy5oaXN0b3J5LnB1c2hTdGF0ZSggeyB1cGRhdGVkX3Byb2ZpbGVfaWQ6IC0xIH0sIG51bGwsIHVwZGF0ZWRfdXJsICk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblxuXHRcdFx0JHByb2ZpbGVfbGkuZmFkZU91dCggNTAwICk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICd0ZXh0Jyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfZGVsZXRlX21pZ3JhdGlvbl9wcm9maWxlJyxcblx0XHRcdFx0XHRwcm9maWxlX2lkOiAkKCB0aGlzICkuYXR0ciggJ2RhdGEtcHJvZmlsZS1pZCcgKSxcblx0XHRcdFx0XHRub25jZTogd3BtZGJfZGF0YS5ub25jZXMuZGVsZXRlX21pZ3JhdGlvbl9wcm9maWxlXG5cdFx0XHRcdH0sXG5cdFx0XHRcdGVycm9yOiBmdW5jdGlvbigganFYSFIsIHRleHRTdGF0dXMsIGVycm9yVGhyb3duICkge1xuXHRcdFx0XHRcdGFsZXJ0KCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlX3Byb2JsZW0gKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0aWYgKCAnLTEnID09PSBkYXRhICkge1xuXHRcdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3MucmVtb3ZlX3Byb2ZpbGVfbm90X2ZvdW5kICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHQvLyBkZWxldGVzIGEgcHJvZmlsZSBmcm9tIHRoZSBtYWluIHByb2ZpbGUgc2VsZWN0aW9uIHNjcmVlblxuXHRcdCQoICcubWFpbi1saXN0LWRlbGV0ZS1wcm9maWxlLWxpbmsnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIG5hbWUgPSAkKCB0aGlzICkucHJldigpLmh0bWwoKTtcblx0XHRcdHZhciBhbnN3ZXIgPSBjb25maXJtKCB3cG1kYl9zdHJpbmdzLnJlbW92ZV9wcm9maWxlLnJlcGxhY2UoICd7e3Byb2ZpbGV9fScsIG5hbWUgKSApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblxuXHRcdFx0JCggdGhpcyApLnBhcmVudCgpLmZhZGVPdXQoIDUwMCApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX2RlbGV0ZV9taWdyYXRpb25fcHJvZmlsZScsXG5cdFx0XHRcdFx0cHJvZmlsZV9pZDogJCggdGhpcyApLmF0dHIoICdkYXRhLXByb2ZpbGUtaWQnICksXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmRlbGV0ZV9taWdyYXRpb25fcHJvZmlsZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRhbGVydCggd3BtZGJfc3RyaW5ncy5yZW1vdmVfcHJvZmlsZV9wcm9ibGVtICk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblxuXHRcdH0gKTtcblxuXHRcdC8vIHdhcm4gdGhlIHVzZXIgd2hlbiBlZGl0aW5nIHRoZSBjb25uZWN0aW9uIGluZm8gYWZ0ZXIgYSBjb25uZWN0aW9uIGhhcyBiZWVuIGVzdGFibGlzaGVkXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudGVtcC1kaXNhYmxlZCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGFuc3dlciA9IGNvbmZpcm0oIHdwbWRiX3N0cmluZ3MuY2hhbmdlX2Nvbm5lY3Rpb25faW5mbyApO1xuXG5cdFx0XHRpZiAoICFhbnN3ZXIgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdCQoICcuc3NsLW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcuZGlmZmVyZW50LXBsdWdpbi12ZXJzaW9uLW5vdGljZScgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcubWlncmF0ZS1kYi1idXR0b24nICkuc2hvdygpO1xuXHRcdFx0XHQkKCAnLnRlbXAtZGlzYWJsZWQnICkucmVtb3ZlQXR0ciggJ3JlYWRvbmx5JyApO1xuXHRcdFx0XHQkKCAnLnRlbXAtZGlzYWJsZWQnICkucmVtb3ZlQ2xhc3MoICd0ZW1wLWRpc2FibGVkJyApO1xuXHRcdFx0XHQkKCAnLmNvbm5lY3QtYnV0dG9uJyApLnNob3coKTtcblx0XHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpLmh0bWwoIHdwbWRiX3N0cmluZ3MuZW50ZXJfY29ubmVjdGlvbl9pbmZvICk7XG5cdFx0XHRcdGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSBmYWxzZTtcblx0XHRcdH1cblx0XHR9ICk7XG5cblx0XHQvLyBhamF4IHJlcXVlc3QgZm9yIHNldHRpbmdzIHBhZ2Ugd2hlbiBjaGVja2luZy91bmNoZWNraW5nIHNldHRpbmcgcmFkaW8gYnV0dG9uc1xuXHRcdCQoICcuc2V0dGluZ3MtdGFiIGlucHV0W3R5cGU9Y2hlY2tib3hdJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoICdwbHVnaW4tY29tcGF0aWJpbGl0eScgPT09ICQoIHRoaXMgKS5hdHRyKCAnaWQnICkgKSB7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHRcdHZhciBjaGVja2VkID0gJCggdGhpcyApLmlzKCAnOmNoZWNrZWQnICk7XG5cdFx0XHR2YXIgc2V0dGluZyA9ICQoIHRoaXMgKS5hdHRyKCAnaWQnICk7XG5cdFx0XHR2YXIgJHN0YXR1cyA9ICQoIHRoaXMgKS5jbG9zZXN0KCAndGQnICkubmV4dCggJ3RkJyApLmZpbmQoICcuc2V0dGluZy1zdGF0dXMnICk7XG5cblx0XHRcdCQoICcuYWpheC1zdWNjZXNzLW1zZycgKS5yZW1vdmUoKTtcblx0XHRcdCRzdGF0dXMuYWZ0ZXIoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3NhdmVfc2V0dGluZycsXG5cdFx0XHRcdFx0Y2hlY2tlZDogY2hlY2tlZCxcblx0XHRcdFx0XHRzZXR0aW5nOiBzZXR0aW5nLFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy5zYXZlX3NldHRpbmdcblx0XHRcdFx0fSxcblx0XHRcdFx0ZXJyb3I6IGZ1bmN0aW9uKCBqcVhIUiwgdGV4dFN0YXR1cywgZXJyb3JUaHJvd24gKSB7XG5cdFx0XHRcdFx0YWxlcnQoIHdwbWRiX3N0cmluZ3Muc2F2ZV9zZXR0aW5nc19wcm9ibGVtICk7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdCRzdGF0dXMuYXBwZW5kKCAnPHNwYW4gY2xhc3M9XCJhamF4LXN1Y2Nlc3MtbXNnXCI+JyArIHdwbWRiX3N0cmluZ3Muc2F2ZWQgKyAnPC9zcGFuPicgKTtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3VjY2Vzcy1tc2cnICkuZmFkZU91dCggMjAwMCwgZnVuY3Rpb24oKSB7XG5cdFx0XHRcdFx0XHQkKCB0aGlzICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0fSApO1xuXHRcdFx0XHR9XG5cdFx0XHR9ICk7XG5cblx0XHR9ICk7XG5cblx0XHQvLyBkaXNhYmxlIGZvcm0gc3VibWlzc2lvbnNcblx0XHQkKCAnLm1pZ3JhdGUtZm9ybScgKS5zdWJtaXQoIGZ1bmN0aW9uKCBlICkge1xuXHRcdFx0ZS5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdH0gKTtcblxuXHRcdC8vIGZpcmUgY29ubmVjdGlvbl9ib3hfY2hhbmdlZCB3aGVuIHRoZSBjb25uZWN0IGJ1dHRvbiBpcyBwcmVzc2VkXG5cdFx0JCggJy5jb25uZWN0LWJ1dHRvbicgKS5jbGljayggZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0ZXZlbnQucHJldmVudERlZmF1bHQoKTtcblx0XHRcdCQoIHRoaXMgKS5ibHVyKCk7XG5cdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0fSApO1xuXG5cdFx0Ly8gc2VuZCBwYXN0ZSBldmVuIHRvIGNvbm5lY3Rpb25fYm94X2NoYW5nZWQoKSBmdW5jdGlvblxuXHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5iaW5kKCAncGFzdGUnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdHZhciAkdGhpcyA9IHRoaXM7XG5cdFx0XHRzZXRUaW1lb3V0KCBmdW5jdGlvbigpIHtcblx0XHRcdFx0Y29ubmVjdGlvbl9ib3hfY2hhbmdlZCgpO1xuXHRcdFx0fSwgMCApO1xuXG5cdFx0fSApO1xuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudHJ5LWFnYWluJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0fSApO1xuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcudHJ5LWh0dHAnLCBmdW5jdGlvbigpIHtcblx0XHRcdHZhciBjb25uZWN0aW9uX2luZm8gPSAkLnRyaW0oICQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoKSApLnNwbGl0KCAnXFxuJyApO1xuXHRcdFx0dmFyIG5ld191cmwgPSBjb25uZWN0aW9uX2luZm9bIDAgXS5yZXBsYWNlKCAnaHR0cHMnLCAnaHR0cCcgKTtcblx0XHRcdHZhciBuZXdfY29udGVudHMgPSBuZXdfdXJsICsgJ1xcbicgKyBjb25uZWN0aW9uX2luZm9bIDEgXTtcblx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoIG5ld19jb250ZW50cyApO1xuXHRcdFx0Y29ubmVjdGlvbl9ib3hfY2hhbmdlZCgpO1xuXHRcdH0gKTtcblxuXHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRwcm9maWxlX25hbWVfZWRpdGVkID0gdHJ1ZTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy50ZW1wb3JhcmlseS1kaXNhYmxlLXNzbCcsIGZ1bmN0aW9uKCkge1xuXHRcdFx0dmFyIGhhc2ggPSAnJztcblx0XHRcdGlmICggd2luZG93LmxvY2F0aW9uLmhhc2ggKSB7XG5cdFx0XHRcdGhhc2ggPSB3aW5kb3cubG9jYXRpb24uaGFzaC5zdWJzdHJpbmcoIDEgKTtcblx0XHRcdH1cblx0XHRcdCQoIHRoaXMgKS5hdHRyKCAnaHJlZicsICQoIHRoaXMgKS5hdHRyKCAnaHJlZicgKSArICcmaGFzaD0nICsgaGFzaCApO1xuXHRcdH0gKTtcblxuXHRcdC8vIGZpcmVkIHdoZW4gdGhlIGNvbm5lY3Rpb24gaW5mbyBib3ggY2hhbmdlcyAoZS5nLiBnZXRzIHBhc3RlZCBpbnRvKVxuXHRcdGZ1bmN0aW9uIGNvbm5lY3Rpb25fYm94X2NoYW5nZWQoIGRhdGEgKSB7XG5cdFx0XHR2YXIgJHRoaXMgPSAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICk7XG5cblx0XHRcdGlmICggZG9pbmdfYWpheCB8fCAkKCAkdGhpcyApLmhhc0NsYXNzKCAndGVtcC1kaXNhYmxlZCcgKSApIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXG5cdFx0XHRkYXRhID0gJCggJy5wdWxsLXB1c2gtY29ubmVjdGlvbi1pbmZvJyApLnZhbCgpO1xuXG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCBkYXRhICkuc3BsaXQoICdcXG4nICk7XG5cdFx0XHR2YXIgZXJyb3IgPSBmYWxzZTtcblx0XHRcdHZhciBlcnJvcl9tZXNzYWdlID0gJyc7XG5cblx0XHRcdGlmICggJycgPT09IGNvbm5lY3Rpb25faW5mbyApIHtcblx0XHRcdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRlcnJvcl9tZXNzYWdlID0gd3BtZGJfc3RyaW5ncy5jb25uZWN0aW9uX2luZm9fbWlzc2luZztcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAyICE9PSBjb25uZWN0aW9uX2luZm8ubGVuZ3RoICYmICFlcnJvciApIHtcblx0XHRcdFx0ZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRlcnJvcl9tZXNzYWdlID0gd3BtZGJfc3RyaW5ncy5jb25uZWN0aW9uX2luZm9faW5jb3JyZWN0O1xuXHRcdFx0fVxuXG5cdFx0XHRpZiAoICFlcnJvciAmJiAhdmFsaWRhdGVfdXJsKCBjb25uZWN0aW9uX2luZm9bIDAgXSApICkge1xuXHRcdFx0XHRlcnJvciA9IHRydWU7XG5cdFx0XHRcdGVycm9yX21lc3NhZ2UgPSB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25faW5mb191cmxfaW52YWxpZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgMzIgPj0gY29ubmVjdGlvbl9pbmZvWyAxIF0ubGVuZ3RoICkge1xuXHRcdFx0XHRlcnJvciA9IHRydWU7XG5cdFx0XHRcdGVycm9yX21lc3NhZ2UgPSB3cG1kYl9zdHJpbmdzLmNvbm5lY3Rpb25faW5mb19rZXlfaW52YWxpZDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgY29ubmVjdGlvbl9pbmZvWyAwIF0gPT09IHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvWyAwIF0gKSB7XG5cdFx0XHRcdGVycm9yID0gdHJ1ZTtcblx0XHRcdFx0ZXJyb3JfbWVzc2FnZSA9IHdwbWRiX3N0cmluZ3MuY29ubmVjdGlvbl9pbmZvX2xvY2FsX3VybDtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCAhZXJyb3IgJiYgY29ubmVjdGlvbl9pbmZvWyAxIF0gPT09IHdwbWRiX2RhdGEuY29ubmVjdGlvbl9pbmZvWyAxIF0gKSB7XG5cdFx0XHRcdGVycm9yID0gdHJ1ZTtcblx0XHRcdFx0ZXJyb3JfbWVzc2FnZSA9IHdwbWRiX3N0cmluZ3MuY29ubmVjdGlvbl9pbmZvX2xvY2FsX2tleTtcblx0XHRcdH1cblxuXHRcdFx0aWYgKCBlcnJvciApIHtcblx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5odG1sKCBlcnJvcl9tZXNzYWdlICk7XG5cdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cblx0XHRcdHZhciBuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzID0gY29ubmVjdGlvbl9pbmZvWyAwIF0gKyAnXFxuJyArIGNvbm5lY3Rpb25faW5mb1sgMSBdO1xuXG5cdFx0XHRpZiAoIGZhbHNlID09PSB3cG1kYl9kYXRhLm9wZW5zc2xfYXZhaWxhYmxlICkge1xuXHRcdFx0XHRjb25uZWN0aW9uX2luZm9bIDAgXSA9IGNvbm5lY3Rpb25faW5mb1sgMCBdLnJlcGxhY2UoICdodHRwczovLycsICdodHRwOi8vJyApO1xuXHRcdFx0XHRuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzID0gY29ubmVjdGlvbl9pbmZvWyAwIF0gKyAnXFxuJyArIGNvbm5lY3Rpb25faW5mb1sgMSBdO1xuXHRcdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCBuZXdfY29ubmVjdGlvbl9pbmZvX2NvbnRlbnRzICk7XG5cdFx0XHR9XG5cblx0XHRcdHNob3dfcHJlZml4X25vdGljZSA9IGZhbHNlO1xuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRkaXNhYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCk7XG5cblx0XHRcdGlmICggJCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLmlzKCAnOnZpc2libGUnICkgKSB7XG5cdFx0XHRcdGNvbm5lY3Rpb25faW5mb1sgMCBdID0gY29ubmVjdGlvbl9pbmZvWyAwIF0ucmVwbGFjZSggL1xcL1xcLyguKilALywgJy8vJyApO1xuXHRcdFx0XHRjb25uZWN0aW9uX2luZm9bIDAgXSA9IGNvbm5lY3Rpb25faW5mb1sgMCBdLnJlcGxhY2UoICcvLycsICcvLycgKyBlbmNvZGVVUklDb21wb25lbnQoICQudHJpbSggJCggJy5hdXRoLXVzZXJuYW1lJyApLnZhbCgpICkgKSArICc6JyArIGVuY29kZVVSSUNvbXBvbmVudCggJC50cmltKCAkKCAnLmF1dGgtcGFzc3dvcmQnICkudmFsKCkgKSApICsgJ0AnICk7XG5cdFx0XHRcdG5ld19jb25uZWN0aW9uX2luZm9fY29udGVudHMgPSBjb25uZWN0aW9uX2luZm9bIDAgXSArICdcXG4nICsgY29ubmVjdGlvbl9pbmZvWyAxIF07XG5cdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS52YWwoIG5ld19jb25uZWN0aW9uX2luZm9fY29udGVudHMgKTtcblx0XHRcdFx0JCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLmhpZGUoKTtcblx0XHRcdH1cblxuXHRcdFx0JCggJy5zdGVwLXR3bycgKS5oaWRlKCk7XG5cdFx0XHQkKCAnLnNzbC1ub3RpY2UnICkuaGlkZSgpO1xuXHRcdFx0JCggJy5wcmVmaXgtbm90aWNlJyApLmhpZGUoKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuc2hvdygpO1xuXG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MuZXN0YWJsaXNoaW5nX3JlbW90ZV9jb25uZWN0aW9uICk7XG5cdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLnJlbW92ZUNsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYXBwZW5kKCBhamF4X3NwaW5uZXIgKTtcblxuXHRcdFx0dmFyIGludGVudCA9IHdwbWRiX21pZ3JhdGlvbl90eXBlKCk7XG5cblx0XHRcdHByb2ZpbGVfbmFtZV9lZGl0ZWQgPSBmYWxzZTtcblxuXHRcdFx0JC5hamF4KCB7XG5cdFx0XHRcdHVybDogYWpheHVybCxcblx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRkYXRhVHlwZTogJ2pzb24nLFxuXHRcdFx0XHRjYWNoZTogZmFsc2UsXG5cdFx0XHRcdGRhdGE6IHtcblx0XHRcdFx0XHRhY3Rpb246ICd3cG1kYl92ZXJpZnlfY29ubmVjdGlvbl90b19yZW1vdGVfc2l0ZScsXG5cdFx0XHRcdFx0dXJsOiBjb25uZWN0aW9uX2luZm9bIDAgXSxcblx0XHRcdFx0XHRrZXk6IGNvbm5lY3Rpb25faW5mb1sgMSBdLFxuXHRcdFx0XHRcdGludGVudDogaW50ZW50LFxuXHRcdFx0XHRcdG5vbmNlOiB3cG1kYl9kYXRhLm5vbmNlcy52ZXJpZnlfY29ubmVjdGlvbl90b19yZW1vdGVfc2l0ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxMDApJywganFYSFIgKSApO1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRlbmFibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXHRcdFx0XHRcdG1heWJlX3Nob3dfc3NsX3dhcm5pbmcoIGNvbm5lY3Rpb25faW5mb1sgMCBdLCBjb25uZWN0aW9uX2luZm9bIDEgXSwgZGF0YS5zY2hlbWUgKTtcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLndwbWRiX2Vycm9yICYmIDEgPT09IGRhdGEud3BtZGJfZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGRhdGEuYm9keSApO1xuXHRcdFx0XHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5hZGRDbGFzcyggJ25vdGlmaWNhdGlvbi1tZXNzYWdlIGVycm9yLW5vdGljZSBtaWdyYXRpb24tZXJyb3InICk7XG5cblx0XHRcdFx0XHRcdGlmICggZGF0YS5ib2R5LmluZGV4T2YoICc0MDEgVW5hdXRob3JpemVkJyApID4gLTEgKSB7XG5cdFx0XHRcdFx0XHRcdCQoICcuYmFzaWMtYWNjZXNzLWF1dGgtd3JhcHBlcicgKS5zaG93KCk7XG5cdFx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR2YXIgcHJvZmlsZV9uYW1lID0gZ2V0X2RvbWFpbl9uYW1lKCBkYXRhLnVybCApO1xuXHRcdFx0XHRcdCQoICcuY3JlYXRlLW5ldy1wcm9maWxlJyApLnZhbCggcHJvZmlsZV9uYW1lICk7XG5cblx0XHRcdFx0XHQkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkuYWRkQ2xhc3MoICd0ZW1wLWRpc2FibGVkJyApO1xuXHRcdFx0XHRcdCQoICcucHVsbC1wdXNoLWNvbm5lY3Rpb24taW5mbycgKS5hdHRyKCAncmVhZG9ubHknLCAncmVhZG9ubHknICk7XG5cdFx0XHRcdFx0JCggJy5jb25uZWN0LWJ1dHRvbicgKS5oaWRlKCk7XG5cblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmhpZGUoKTtcblx0XHRcdFx0XHQkKCAnLnN0ZXAtdHdvJyApLnNob3coKTtcblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfcHJlZml4X25vdGljZSggZGF0YS5wcmVmaXggKTtcblxuXHRcdFx0XHRcdGNvbm5lY3Rpb25fZXN0YWJsaXNoZWQgPSB0cnVlO1xuXHRcdFx0XHRcdHNldF9jb25uZWN0aW9uX2RhdGEoIGRhdGEgKTtcblx0XHRcdFx0XHRtb3ZlX2Nvbm5lY3Rpb25faW5mb19ib3goKTtcblx0XHRcdFx0XHRjaGFuZ2VfcmVwbGFjZV92YWx1ZXMoKTtcblxuXHRcdFx0XHRcdG1heWJlX3Nob3dfbWl4ZWRfY2FzZWRfdGFibGVfbmFtZV93YXJuaW5nKCk7XG5cblx0XHRcdFx0XHRyZWZyZXNoX3RhYmxlX3NlbGVjdHMoKTtcblxuXHRcdFx0XHRcdCRwdXNoX3NlbGVjdF9iYWNrdXAgPSAkKCAkcHVsbF9zZWxlY3QgKS5jbG9uZSgpO1xuXHRcdFx0XHRcdCQoICRwdXNoX3NlbGVjdF9iYWNrdXAgKS5hdHRyKCB7XG5cdFx0XHRcdFx0XHRuYW1lOiAnc2VsZWN0X2JhY2t1cFtdJyxcblx0XHRcdFx0XHRcdGlkOiAnc2VsZWN0LWJhY2t1cCdcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHR2YXIgJHBvc3RfdHlwZV9zZWxlY3QgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCAnc2VsZWN0JyApO1xuXHRcdFx0XHRcdCQoICRwb3N0X3R5cGVfc2VsZWN0ICkuYXR0cigge1xuXHRcdFx0XHRcdFx0bXVsdGlwbGU6ICdtdWx0aXBsZScsXG5cdFx0XHRcdFx0XHRuYW1lOiAnc2VsZWN0X3Bvc3RfdHlwZXNbXScsXG5cdFx0XHRcdFx0XHRpZDogJ3NlbGVjdC1wb3N0LXR5cGVzJyxcblx0XHRcdFx0XHRcdGNsYXNzOiAnbXVsdGlzZWxlY3QnXG5cdFx0XHRcdFx0fSApO1xuXG5cdFx0XHRcdFx0JC5lYWNoKCB3cG1kYi5jb21tb24uY29ubmVjdGlvbl9kYXRhLnBvc3RfdHlwZXMsIGZ1bmN0aW9uKCBpbmRleCwgdmFsdWUgKSB7XG5cdFx0XHRcdFx0XHQkKCAkcG9zdF90eXBlX3NlbGVjdCApLmFwcGVuZCggJzxvcHRpb24gdmFsdWU9XCInICsgdmFsdWUgKyAnXCI+JyArIHZhbHVlICsgJzwvb3B0aW9uPicgKTtcblx0XHRcdFx0XHR9ICk7XG5cblx0XHRcdFx0XHQkcHVsbF9wb3N0X3R5cGVfc2VsZWN0ID0gJHBvc3RfdHlwZV9zZWxlY3Q7XG5cblx0XHRcdFx0XHQkKCAnI25ldy1wYXRoLW1pc3Npbmctd2FybmluZywgI25ldy11cmwtbWlzc2luZy13YXJuaW5nJyApLmhpZGUoKTtcblxuXHRcdFx0XHRcdGlmICggJ3B1bGwnID09PSB3cG1kYl9taWdyYXRpb25fdHlwZSgpICkge1xuXHRcdFx0XHRcdFx0JCggJyNuZXctdXJsJyApLnZhbCggcmVtb3ZlX3Byb3RvY29sKCB3cG1kYl9kYXRhLnRoaXNfdXJsICkgKTtcblx0XHRcdFx0XHRcdCQoICcjbmV3LXBhdGgnICkudmFsKCB3cG1kYl9kYXRhLnRoaXNfcGF0aCApO1xuXHRcdFx0XHRcdFx0aWYgKCAndHJ1ZScgPT09IHdwbWRiX2RhdGEuaXNfbXVsdGlzaXRlICkge1xuXHRcdFx0XHRcdFx0XHQkKCAnI25ldy1kb21haW4nICkudmFsKCB3cG1kYl9kYXRhLnRoaXNfZG9tYWluICk7XG5cdFx0XHRcdFx0XHRcdCQoICcucmVwbGFjZS1yb3cucGluIC5vbGQtcmVwbGFjZS1jb2wgaW5wdXRbdHlwZT1cInRleHRcIl0nICkudmFsKCByZW1vdmVfcHJvdG9jb2woIGRhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdCQoICcjb2xkLXVybCcgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggZGF0YS51cmwgKSApO1xuXHRcdFx0XHRcdFx0JCggJyNvbGQtcGF0aCcgKS52YWwoIGRhdGEucGF0aCApO1xuXHRcdFx0XHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl91cGRhdGVfcHVsbF90YWJsZV9zZWxlY3QnICk7XG5cdFx0XHRcdFx0XHQkKCAnI3NlbGVjdC1wb3N0LXR5cGVzJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdFx0JCggJy5leGNsdWRlLXBvc3QtdHlwZXMtd2FybmluZycgKS5hZnRlciggJHB1bGxfcG9zdF90eXBlX3NlbGVjdCApO1xuXHRcdFx0XHRcdFx0ZXhjbHVkZV9wb3N0X3R5cGVzX3dhcm5pbmcoKTtcblx0XHRcdFx0XHRcdCQoICcudGFibGUtcHJlZml4JyApLmh0bWwoIGRhdGEucHJlZml4ICk7XG5cdFx0XHRcdFx0XHQkKCAnLnVwbG9hZHMtZGlyJyApLmh0bWwoIHdwbWRiX2RhdGEudGhpc191cGxvYWRzX2RpciApO1xuXHRcdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0XHQkKCAnI25ldy11cmwnICkudmFsKCByZW1vdmVfcHJvdG9jb2woIGRhdGEudXJsICkgKTtcblx0XHRcdFx0XHRcdCQoICcjbmV3LXBhdGgnICkudmFsKCBkYXRhLnBhdGggKTtcblx0XHRcdFx0XHRcdGlmICggJ3RydWUnID09PSB3cG1kYl9kYXRhLmlzX211bHRpc2l0ZSApIHtcblx0XHRcdFx0XHRcdFx0JCggJy5yZXBsYWNlLXJvdy5waW4gLm9sZC1yZXBsYWNlLWNvbCBpbnB1dFt0eXBlPVwidGV4dFwiXScgKS52YWwoIHJlbW92ZV9wcm90b2NvbCggd3BtZGJfZGF0YS50aGlzX3VybCApICk7XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHQkLndwbWRiLmRvX2FjdGlvbiggJ3dwbWRiX3VwZGF0ZV9wdXNoX3RhYmxlX3NlbGVjdCcgKTtcblx0XHRcdFx0XHRcdCQoICcjc2VsZWN0LWJhY2t1cCcgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRcdCQoICcuYmFja3VwLXRhYmxlcy13cmFwJyApLnByZXBlbmQoICRwdXNoX3NlbGVjdF9iYWNrdXAgKTtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbiA9IHtcblx0XHRcdFx0XHRcdGZuOiAkLndwbWRiLmRvX2FjdGlvbixcblx0XHRcdFx0XHRcdGFyZ3M6IFsgJ3ZlcmlmeV9jb25uZWN0aW9uX3RvX3JlbW90ZV9zaXRlJywgd3BtZGIuY29tbW9uLmNvbm5lY3Rpb25fZGF0YSBdXG5cdFx0XHRcdFx0fTtcblx0XHRcdFx0XHR3cG1kYi5mdW5jdGlvbnMuZXhlY3V0ZV9uZXh0X3N0ZXAoKTtcblx0XHRcdFx0fVxuXG5cdFx0XHR9ICk7XG5cblx0XHR9XG5cblx0XHQvLyBTZXRzIHRoZSBpbml0aWFsIFBhdXNlL1Jlc3VtZSBidXR0b24gZXZlbnQgdG8gUGF1c2Vcblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5wYXVzZS1yZXN1bWUnLCBmdW5jdGlvbiggZXZlbnQgKSB7XG5cdFx0XHRzZXRfcGF1c2VfcmVzdW1lX2J1dHRvbiggZXZlbnQgKTtcblx0XHR9ICk7XG5cblx0XHRmdW5jdGlvbiBjYW5jZWxfbWlncmF0aW9uKCBldmVudCApIHtcblx0XHRcdG1pZ3JhdGlvbl9jYW5jZWxsZWQgPSB0cnVlO1xuXHRcdFx0JCggJy5taWdyYXRpb24tY29udHJvbHMnICkuY3NzKCB7IHZpc2liaWxpdHk6ICdoaWRkZW4nIH0gKTtcblxuXHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24uc2V0U3RhdGUoIHdwbWRiX3N0cmluZ3MuY2FuY2VsbGluZ19taWdyYXRpb24sIHdwbWRiX3N0cmluZ3MuY29tcGxldGluZ19jdXJyZW50X3JlcXVlc3QsICdjYW5jZWxsaW5nJyApO1xuXG5cdFx0XHRpZiAoIHRydWUgPT09IG1pZ3JhdGlvbl9wYXVzZWQgKSB7XG5cdFx0XHRcdG1pZ3JhdGlvbl9wYXVzZWQgPSBmYWxzZTtcblx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcuY2FuY2VsJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0Y2FuY2VsX21pZ3JhdGlvbiggZXZlbnQgKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnLmVudGVyLWxpY2VuY2UnICkuY2xpY2soIGZ1bmN0aW9uKCkge1xuXHRcdFx0JCggJy5zZXR0aW5ncycgKS5jbGljaygpO1xuXHRcdFx0JCggJy5saWNlbmNlLWlucHV0JyApLmZvY3VzKCk7XG5cdFx0fSApO1xuXG5cdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwID0gZnVuY3Rpb24oKSB7XG5cblx0XHRcdC8vIGlmIGRlbGF5IGlzIHNldCwgc2V0IGEgdGltZW91dCBmb3IgZGVsYXkgdG8gcmVjYWxsIHRoaXMgZnVuY3Rpb24sIHRoZW4gcmV0dXJuXG5cdFx0XHRpZiAoIDAgPCBkZWxheV9iZXR3ZWVuX3JlcXVlc3RzICYmIGZhbHNlID09PSBmbGFnX3NraXBfZGVsYXkgKSB7XG5cdFx0XHRcdHNldFRpbWVvdXQoIGZ1bmN0aW9uKCkge1xuXHRcdFx0XHRcdGZsYWdfc2tpcF9kZWxheSA9IHRydWU7XG5cdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLmV4ZWN1dGVfbmV4dF9zdGVwKCk7XG5cdFx0XHRcdH0sIGRlbGF5X2JldHdlZW5fcmVxdWVzdHMgKTtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZmxhZ19za2lwX2RlbGF5ID0gZmFsc2U7XG5cdFx0XHR9XG5cblx0XHRcdGlmICggdHJ1ZSA9PT0gbWlncmF0aW9uX3BhdXNlZCApIHtcblx0XHRcdFx0JCggJy5taWdyYXRpb24tcHJvZ3Jlc3MtYWpheC1zcGlubmVyJyApLmhpZGUoKTtcblxuXHRcdFx0XHQvLyBQYXVzZSB0aGUgdGltZXJcblx0XHRcdFx0d3BtZGIuY3VycmVudF9taWdyYXRpb24ucGF1c2VUaW1lcigpO1xuXG5cdFx0XHRcdHZhciBwYXVzZV90ZXh0ID0gJyc7XG5cdFx0XHRcdGlmICggdHJ1ZSA9PT0gaXNfYXV0b19wYXVzZV9iZWZvcmVfZmluYWxpemUgKSB7XG5cdFx0XHRcdFx0cGF1c2VfdGV4dCA9IHdwbWRiX3N0cmluZ3MucGF1c2VkX2JlZm9yZV9maW5hbGl6ZTtcblx0XHRcdFx0XHRpc19hdXRvX3BhdXNlX2JlZm9yZV9maW5hbGl6ZSA9IGZhbHNlO1xuXHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdHBhdXNlX3RleHQgPSB3cG1kYl9zdHJpbmdzLnBhdXNlZDtcblx0XHRcdFx0fVxuXG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCBudWxsLCBwYXVzZV90ZXh0LCAncGF1c2VkJyApO1xuXG5cdFx0XHRcdC8vIFJlLWJpbmQgUGF1c2UvUmVzdW1lIGJ1dHRvbiB0byBSZXN1bWUgd2hlbiB3ZSBhcmUgZmluYWxseSBQYXVzZWRcblx0XHRcdFx0JCggJ2JvZHknICkub24oICdjbGljaycsICcucGF1c2UtcmVzdW1lJywgZnVuY3Rpb24oIGV2ZW50ICkge1xuXHRcdFx0XHRcdHNldF9wYXVzZV9yZXN1bWVfYnV0dG9uKCBldmVudCApO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoICdib2R5JyApLm9uKCAnY2xpY2snLCAnLmNhbmNlbCcsIGZ1bmN0aW9uKCBldmVudCApIHtcblx0XHRcdFx0XHRjYW5jZWxfbWlncmF0aW9uKCBldmVudCApO1xuXHRcdFx0XHR9ICk7XG5cdFx0XHRcdCQoICcucGF1c2UtcmVzdW1lJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MucmVzdW1lICk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH0gZWxzZSBpZiAoIHRydWUgPT09IG1pZ3JhdGlvbl9jYW5jZWxsZWQgKSB7XG5cdFx0XHRcdG1pZ3JhdGlvbl9pbnRlbnQgPSB3cG1kYl9taWdyYXRpb25fdHlwZSgpO1xuXG5cdFx0XHRcdHZhciBwcm9ncmVzc19tc2c7XG5cblx0XHRcdFx0aWYgKCAnc2F2ZWZpbGUnID09PSBtaWdyYXRpb25faW50ZW50ICkge1xuXHRcdFx0XHRcdHByb2dyZXNzX21zZyA9IHdwbWRiX3N0cmluZ3MucmVtb3ZpbmdfbG9jYWxfc3FsO1xuXHRcdFx0XHR9IGVsc2UgaWYgKCAncHVsbCcgPT09IG1pZ3JhdGlvbl9pbnRlbnQgKSB7XG5cdFx0XHRcdFx0aWYgKCAnYmFja3VwJyA9PT0gc3RhZ2UgKSB7XG5cdFx0XHRcdFx0XHRwcm9ncmVzc19tc2cgPSB3cG1kYl9zdHJpbmdzLnJlbW92aW5nX2xvY2FsX2JhY2t1cDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NfbXNnID0gd3BtZGJfc3RyaW5ncy5yZW1vdmluZ19sb2NhbF90ZW1wX3RhYmxlcztcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH0gZWxzZSBpZiAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0XHRpZiAoICdiYWNrdXAnID09PSBzdGFnZSApIHtcblx0XHRcdFx0XHRcdHByb2dyZXNzX21zZyA9IHdwbWRiX3N0cmluZ3MucmVtb3ZpbmdfcmVtb3RlX3NxbDtcblx0XHRcdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRcdFx0cHJvZ3Jlc3NfbXNnID0gd3BtZGJfc3RyaW5ncy5yZW1vdmluZ19yZW1vdGVfdGVtcF90YWJsZXM7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFRleHQoIHByb2dyZXNzX21zZyApO1xuXG5cdFx0XHRcdHZhciByZXF1ZXN0X2RhdGEgPSB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfY2FuY2VsX21pZ3JhdGlvbicsXG5cdFx0XHRcdFx0bWlncmF0aW9uX3N0YXRlX2lkOiB3cG1kYi5taWdyYXRpb25fc3RhdGVfaWRcblx0XHRcdFx0fTtcblxuXHRcdFx0XHRkb2luZ19hamF4ID0gdHJ1ZTtcblxuXHRcdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdFx0dHlwZTogJ1BPU1QnLFxuXHRcdFx0XHRcdGRhdGFUeXBlOiAndGV4dCcsXG5cdFx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRcdGRhdGE6IHJlcXVlc3RfZGF0YSxcblx0XHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHRcdHdwbWRiLmN1cnJlbnRfbWlncmF0aW9uLnNldFN0YXRlKCB3cG1kYl9zdHJpbmdzLm1pZ3JhdGlvbl9jYW5jZWxsYXRpb25fZmFpbGVkLCB3cG1kYl9zdHJpbmdzLm1hbnVhbGx5X3JlbW92ZV90ZW1wX2ZpbGVzICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICc6ICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJzo8YnIgLz4nICsganFYSFIucmVzcG9uc2VUZXh0LCAnZXJyb3InICk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZygganFYSFIgKTtcblx0XHRcdFx0XHRcdGNvbnNvbGUubG9nKCB0ZXh0U3RhdHVzICk7XG5cdFx0XHRcdFx0XHRjb25zb2xlLmxvZyggZXJyb3JUaHJvd24gKTtcblx0XHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRcdHdwbWRiLmNvbW1vbi5taWdyYXRpb25fZXJyb3IgPSB0cnVlO1xuXHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9LFxuXHRcdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdFx0ZGF0YSA9ICQudHJpbSggZGF0YSApO1xuXHRcdFx0XHRcdFx0aWYgKCAoICdwdXNoJyA9PT0gbWlncmF0aW9uX2ludGVudCAmJiAnMScgIT09IGRhdGEgKSB8fCAoICdwdXNoJyAhPT0gbWlncmF0aW9uX2ludGVudCAmJiAnJyAhPT0gZGF0YSApICkge1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0ZSggd3BtZGJfc3RyaW5ncy5taWdyYXRpb25fY2FuY2VsbGF0aW9uX2ZhaWxlZCwgZGF0YSwgJ2Vycm9yJyApO1xuXHRcdFx0XHRcdFx0XHR3cG1kYi5jb21tb24ubWlncmF0aW9uX2Vycm9yID0gdHJ1ZTtcblx0XHRcdFx0XHRcdFx0d3BtZGIuZnVuY3Rpb25zLm1pZ3JhdGlvbl9jb21wbGV0ZV9ldmVudHMoKTtcblx0XHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdFx0fVxuXHRcdFx0XHRcdFx0Y29tcGxldGVkX21zZyA9IHdwbWRiX3N0cmluZ3MubWlncmF0aW9uX2NhbmNlbGxlZDtcblx0XHRcdFx0XHRcdHdwbWRiLmZ1bmN0aW9ucy5taWdyYXRpb25fY29tcGxldGVfZXZlbnRzKCk7XG5cdFx0XHRcdFx0XHR3cG1kYi5jdXJyZW50X21pZ3JhdGlvbi5zZXRTdGF0dXMoICdjYW5jZWxsZWQnICk7XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9ICk7XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHR3cG1kYi5jb21tb24ubmV4dF9zdGVwX2luX21pZ3JhdGlvbi5mbi5hcHBseSggbnVsbCwgd3BtZGIuY29tbW9uLm5leHRfc3RlcF9pbl9taWdyYXRpb24uYXJncyApO1xuXHRcdFx0fVxuXHRcdH07XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5jb3B5LWxpY2VuY2UtdG8tcmVtb3RlLXNpdGUnLCBmdW5jdGlvbigpIHtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggd3BtZGJfc3RyaW5ncy5jb3B5aW5nX2xpY2Vuc2UgKTtcblx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkucmVtb3ZlQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0JCggJy5jb25uZWN0aW9uLXN0YXR1cycgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHR2YXIgY29ubmVjdGlvbl9pbmZvID0gJC50cmltKCAkKCAnLnB1bGwtcHVzaC1jb25uZWN0aW9uLWluZm8nICkudmFsKCkgKS5zcGxpdCggJ1xcbicgKTtcblxuXHRcdFx0ZG9pbmdfYWpheCA9IHRydWU7XG5cdFx0XHRkaXNhYmxlX2V4cG9ydF90eXBlX2NvbnRyb2xzKCk7XG5cblx0XHRcdCQuYWpheCgge1xuXHRcdFx0XHR1cmw6IGFqYXh1cmwsXG5cdFx0XHRcdHR5cGU6ICdQT1NUJyxcblx0XHRcdFx0ZGF0YVR5cGU6ICdqc29uJyxcblx0XHRcdFx0Y2FjaGU6IGZhbHNlLFxuXHRcdFx0XHRkYXRhOiB7XG5cdFx0XHRcdFx0YWN0aW9uOiAnd3BtZGJfY29weV9saWNlbmNlX3RvX3JlbW90ZV9zaXRlJyxcblx0XHRcdFx0XHR1cmw6IGNvbm5lY3Rpb25faW5mb1sgMCBdLFxuXHRcdFx0XHRcdGtleTogY29ubmVjdGlvbl9pbmZvWyAxIF0sXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLmNvcHlfbGljZW5jZV90b19yZW1vdGVfc2l0ZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmh0bWwoIGdldF9hamF4X2Vycm9ycygganFYSFIucmVzcG9uc2VUZXh0LCAnKCMxNDMpJywganFYSFIgKSApO1xuXHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuYWRkQ2xhc3MoICdub3RpZmljYXRpb24tbWVzc2FnZSBlcnJvci1ub3RpY2UgbWlncmF0aW9uLWVycm9yJyApO1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblx0XHRcdFx0XHRlbmFibGVfZXhwb3J0X3R5cGVfY29udHJvbHMoKTtcblx0XHRcdFx0fSxcblx0XHRcdFx0c3VjY2VzczogZnVuY3Rpb24oIGRhdGEgKSB7XG5cdFx0XHRcdFx0JCggJy5hamF4LXNwaW5uZXInICkucmVtb3ZlKCk7XG5cdFx0XHRcdFx0ZG9pbmdfYWpheCA9IGZhbHNlO1xuXHRcdFx0XHRcdGVuYWJsZV9leHBvcnRfdHlwZV9jb250cm9scygpO1xuXG5cdFx0XHRcdFx0aWYgKCAndW5kZWZpbmVkJyAhPT0gdHlwZW9mIGRhdGEud3BtZGJfZXJyb3IgJiYgMSA9PT0gZGF0YS53cG1kYl9lcnJvciApIHtcblx0XHRcdFx0XHRcdCQoICcuY29ubmVjdGlvbi1zdGF0dXMnICkuaHRtbCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0XHQkKCAnLmNvbm5lY3Rpb24tc3RhdHVzJyApLmFkZENsYXNzKCAnbm90aWZpY2F0aW9uLW1lc3NhZ2UgZXJyb3Itbm90aWNlIG1pZ3JhdGlvbi1lcnJvcicgKTtcblxuXHRcdFx0XHRcdFx0aWYgKCBkYXRhLmJvZHkuaW5kZXhPZiggJzQwMSBVbmF1dGhvcml6ZWQnICkgPiAtMSApIHtcblx0XHRcdFx0XHRcdFx0JCggJy5iYXNpYy1hY2Nlc3MtYXV0aC13cmFwcGVyJyApLnNob3coKTtcblx0XHRcdFx0XHRcdH1cblxuXHRcdFx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0XHRjb25uZWN0aW9uX2JveF9jaGFuZ2VkKCk7XG5cdFx0XHRcdH1cblx0XHRcdH0gKTtcblx0XHR9ICk7XG5cblx0XHQkKCAnYm9keScgKS5vbiggJ2NsaWNrJywgJy5yZWFjdGl2YXRlLWxpY2VuY2UnLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGRvaW5nX2FqYXggPSB0cnVlO1xuXG5cdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5lbXB0eSgpLmh0bWwoIHdwbWRiX3N0cmluZ3MuYXR0ZW1wdGluZ190b19hY3RpdmF0ZV9saWNlbmNlICk7XG5cdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5hcHBlbmQoIGFqYXhfc3Bpbm5lciApO1xuXG5cdFx0XHQkLmFqYXgoIHtcblx0XHRcdFx0dXJsOiBhamF4dXJsLFxuXHRcdFx0XHR0eXBlOiAnUE9TVCcsXG5cdFx0XHRcdGRhdGFUeXBlOiAnanNvbicsXG5cdFx0XHRcdGNhY2hlOiBmYWxzZSxcblx0XHRcdFx0ZGF0YToge1xuXHRcdFx0XHRcdGFjdGlvbjogJ3dwbWRiX3JlYWN0aXZhdGVfbGljZW5jZScsXG5cdFx0XHRcdFx0bm9uY2U6IHdwbWRiX2RhdGEubm9uY2VzLnJlYWN0aXZhdGVfbGljZW5jZVxuXHRcdFx0XHR9LFxuXHRcdFx0XHRlcnJvcjogZnVuY3Rpb24oIGpxWEhSLCB0ZXh0U3RhdHVzLCBlcnJvclRocm93biApIHtcblx0XHRcdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5odG1sKCB3cG1kYl9zdHJpbmdzLmFjdGl2YXRlX2xpY2VuY2VfcHJvYmxlbSApO1xuXHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmFwcGVuZCggJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnN0YXR1cyArICc6ICcgKyBqcVhIUi5zdGF0dXMgKyAnICcgKyBqcVhIUi5zdGF0dXNUZXh0ICsgJzxiciAvPjxiciAvPicgKyB3cG1kYl9zdHJpbmdzLnJlc3BvbnNlICsgJzxiciAvPicgKyBqcVhIUi5yZXNwb25zZVRleHQgKTtcblx0XHRcdFx0XHQkKCAnLmFqYXgtc3Bpbm5lcicgKS5yZW1vdmUoKTtcblx0XHRcdFx0XHRkb2luZ19hamF4ID0gZmFsc2U7XG5cdFx0XHRcdH0sXG5cdFx0XHRcdHN1Y2Nlc3M6IGZ1bmN0aW9uKCBkYXRhICkge1xuXHRcdFx0XHRcdCQoICcuYWpheC1zcGlubmVyJyApLnJlbW92ZSgpO1xuXHRcdFx0XHRcdGRvaW5nX2FqYXggPSBmYWxzZTtcblxuXHRcdFx0XHRcdGlmICggJ3VuZGVmaW5lZCcgIT09IHR5cGVvZiBkYXRhLndwbWRiX2Vycm9yICYmIDEgPT09IGRhdGEud3BtZGJfZXJyb3IgKSB7XG5cdFx0XHRcdFx0XHQkKCAnLmludmFsaWQtbGljZW5jZScgKS5odG1sKCBkYXRhLmJvZHkgKTtcblx0XHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0XHR9XG5cblx0XHRcdFx0XHRpZiAoICd1bmRlZmluZWQnICE9PSB0eXBlb2YgZGF0YS53cG1kYl9kYnJhaW5zX2FwaV9kb3duICYmIDEgPT09IGRhdGEud3BtZGJfZGJyYWluc19hcGlfZG93biApIHtcblx0XHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmh0bWwoIHdwbWRiX3N0cmluZ3MudGVtcG9yYXJpbHlfYWN0aXZhdGVkX2xpY2VuY2UgKTtcblx0XHRcdFx0XHRcdCQoICcuaW52YWxpZC1saWNlbmNlJyApLmFwcGVuZCggZGF0YS5ib2R5ICk7XG5cdFx0XHRcdFx0XHRyZXR1cm47XG5cdFx0XHRcdFx0fVxuXG5cdFx0XHRcdFx0JCggJy5pbnZhbGlkLWxpY2VuY2UnICkuZW1wdHkoKS5odG1sKCB3cG1kYl9zdHJpbmdzLmxpY2VuY2VfcmVhY3RpdmF0ZWQgKTtcblx0XHRcdFx0XHRsb2NhdGlvbi5yZWxvYWQoKTtcblx0XHRcdFx0fVxuXHRcdFx0fSApO1xuXG5cdFx0fSApO1xuXG5cdFx0JCggJ2lucHV0W25hbWU9dGFibGVfbWlncmF0ZV9vcHRpb25dJyApLmNoYW5nZSggZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXliZV9zaG93X21peGVkX2Nhc2VkX3RhYmxlX25hbWVfd2FybmluZygpO1xuXHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl90YWJsZXNfdG9fbWlncmF0ZV9jaGFuZ2VkJyApO1xuXHRcdH0gKTtcblxuXHRcdCQoICdib2R5JyApLm9uKCAnY2hhbmdlJywgJyNzZWxlY3QtdGFibGVzJywgZnVuY3Rpb24oKSB7XG5cdFx0XHRtYXliZV9zaG93X21peGVkX2Nhc2VkX3RhYmxlX25hbWVfd2FybmluZygpO1xuXHRcdFx0JC53cG1kYi5kb19hY3Rpb24oICd3cG1kYl90YWJsZXNfdG9fbWlncmF0ZV9jaGFuZ2VkJyApO1xuXHRcdH0gKTtcblxuXHRcdCQud3BtZGIuYWRkX2ZpbHRlciggJ3dwbWRiX2dldF90YWJsZV9wcmVmaXgnLCBnZXRfdGFibGVfcHJlZml4ICk7XG5cdFx0JC53cG1kYi5hZGRfZmlsdGVyKCAnd3BtZGJfZ2V0X3RhYmxlc190b19taWdyYXRlJywgZ2V0X3RhYmxlc190b19taWdyYXRlICk7XG5cdFx0JC53cG1kYi5hZGRfYWN0aW9uKCAnd3BtZGJfbG9ja19yZXBsYWNlX3VybCcsIGxvY2tfcmVwbGFjZV91cmwgKTtcblxuXHRcdCQud3BtZGIuYWRkX2ZpbHRlciggJ3dwbWRiX2JlZm9yZV9taWdyYXRpb25fY29tcGxldGVfaG9va3MnLCBmdW5jdGlvbiggaG9va3MgKSB7XG5cdFx0XHRwYXVzZV9iZWZvcmVfZmluYWxpemUgPSAkKCAnaW5wdXRbbmFtZT1wYXVzZV9iZWZvcmVfZmluYWxpemVdOmNoZWNrZWQnICkubGVuZ3RoID8gdHJ1ZSA6IGZhbHNlO1xuXHRcdFx0aWYgKCB0cnVlID09PSBwYXVzZV9iZWZvcmVfZmluYWxpemUgJiYgJ3NhdmVmaWxlJyAhPT0gbWlncmF0aW9uX2ludGVudCApIHtcblx0XHRcdFx0c2V0X3BhdXNlX3Jlc3VtZV9idXR0b24oIG51bGwgKTsgLy8gZG9uJ3QganVzdCBzZXQgbWlncmF0aW9uX3BhdXNlZCB0byB0cnVlLCBzaW5jZSBgc2V0X3BhdXNlX3Jlc3VtZV9idXR0b25gIHdpbGwgZ2V0IGRvdWJsZSBib3VuZCB0byBjbGlja2luZyByZXN1bWVcblx0XHRcdFx0aXNfYXV0b19wYXVzZV9iZWZvcmVfZmluYWxpemUgPSB0cnVlO1xuXHRcdFx0fVxuXHRcdFx0cmV0dXJuIGhvb2tzO1xuXHRcdH0gKTtcblxuXHRcdC8qKlxuXHRcdCAqIFNldCBjaGVja2JveFxuXHRcdCAqXG5cdFx0ICogQHBhcmFtIHN0cmluZyBjaGVja2JveF93cmFwXG5cdFx0ICovXG5cdFx0ZnVuY3Rpb24gc2V0X2NoZWNrYm94KCBjaGVja2JveF93cmFwICkge1xuXHRcdFx0dmFyICRzd2l0Y2ggPSAkKCAnIycgKyBjaGVja2JveF93cmFwICk7XG5cdFx0XHR2YXIgJGNoZWNrYm94ID0gJHN3aXRjaC5maW5kKCAnaW5wdXRbdHlwZT1jaGVja2JveF0nICk7XG5cblx0XHRcdCRzd2l0Y2gudG9nZ2xlQ2xhc3MoICdvbicgKS5maW5kKCAnc3BhbicgKS50b2dnbGVDbGFzcyggJ2NoZWNrZWQnICk7XG5cdFx0XHR2YXIgc3dpdGNoX29uID0gJHN3aXRjaC5maW5kKCAnc3Bhbi5vbicgKS5oYXNDbGFzcyggJ2NoZWNrZWQnICk7XG5cdFx0XHQkY2hlY2tib3guYXR0ciggJ2NoZWNrZWQnLCBzd2l0Y2hfb24gKS50cmlnZ2VyKCAnY2hhbmdlJyApO1xuXHRcdH1cblxuXHRcdCQoICcud3BtZGItc3dpdGNoJyApLm9uKCAnY2xpY2snLCBmdW5jdGlvbiggZSApIHtcblx0XHRcdGlmICggISAkKCB0aGlzICkuaGFzQ2xhc3MoICdkaXNhYmxlZCcgKSApIHtcblx0XHRcdFx0c2V0X2NoZWNrYm94KCAkKCB0aGlzICkuYXR0ciggJ2lkJyApICk7XG5cdFx0XHR9XG5cdFx0fSApO1xuXG5cdH0gKTtcblxufSkoIGpRdWVyeSwgd3BtZGIgKTtcbiJdfQ==
