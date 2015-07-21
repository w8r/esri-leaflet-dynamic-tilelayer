EsriLeaflet.Layers.TiledDynamicMapLayer = L.TileLayer.extend({

  options: L.Util.extend({},
    EsriLeaflet.Layers.DynamicMapLayer.prototype.options, {
      redrawBuffer: true
    }),

  /**
   * @type {Array.<XmlHttpRequest>}
   */
  _requests: [],

  /**
   * @constructor
   * @extends {L.TileLayer}
   * @param  {String} url
   * @param  {Object} options
   */
  initialize: function(url, options) {
    L.TileLayer.prototype.initialize.call(this, url, options);
    EsriLeaflet.DynamicMapLayer.prototype.initialize.call(this, url, options);
  },

  /**
   * @param  {L.Map} map
   */
  onAdd: function(map) {
    if (map.options.crs && map.options.crs.code) {
      var sr = this._getSr(map.options.crs.code);
      this.options.bboxSR = sr;
      this.options.imageSR = sr;
    }

    map.on('zoomstart zoomend', this._onZoomChange, this);
    return L.TileLayer.prototype.onAdd.call(this, map);
  },

  /**
   * Could be WKT and at least possble to override
   * @param  {String} code
   * @return {String}
   */
  _getSr: function(code) {
    return code.split(':')[1];
  },

  /**
   * @param  {L.Map} map
   */
  onRemove: function(map) {
    map.off('zoomstart zoomend', this._onZoomChange, this);
    L.TileLayer.prototype.onRemove.call(this, map);
    EsriLeaflet.DynamicMapLayer.prototype.onRemove.call(this, map);
  },

  /**
   * @param {Array.<Number>|Array.<String>} layers
   * @return {L.esri.Layers.TiledDynamicMapLayer} self
   */
  setLayers: function(layers) {
    this._redraw();
    return EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayers.call(this, layers);
  },

  /**
   * @param {Array.<Object>} layerDefs
   * @return {L.esri.Layers.TiledDynamicMapLayer} self
   */
  setLayerDefs: function(layerDefs) {
    this._redraw();
    return EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayerDefs.call(this, layerDefs);
  },

  /**
   * @param {Object} timeOptions
   * @return {L.esri.Layers.TiledDynamicMapLayer} self
   */
  setTimeOptions: function(timeOptions) {
    this._redraw();
    return EsriLeaflet.Layers.DynamicMapLayer.prototype.setTimeOptions.call(this, timeOptions);
  },

  /**
   * Set/unset zooming flag to avoid unneeded requests
   * @param  {Object} e
   */
  _onZoomChange: function(e) {
    this._zooming = (e.type === 'zoomstart');
  },

  /**
   * @param  {L.LatLngBounds} bounds
   * @param  {L.Point}        size
   * @return {Object}
   */
  _buildExportParams: function(bounds, size) {
    var ne = this._map.options.crs.project(bounds._northEast);
    var sw = this._map.options.crs.project(bounds._southWest);

    //ensure that we don't ask ArcGIS Server for a taller image than we have actual map displaying
    var top = this._map.latLngToLayerPoint(bounds._northEast);
    var bottom = this._map.latLngToLayerPoint(bounds._southWest);

    if (top.y > 0 || bottom.y < size.y) {
      size.y = bottom.y - top.y;
    }

    var params = {
      bbox: [sw.x, sw.y, ne.x, ne.y].join(','),
      size: size.x + ',' + size.y,
      dpi: 96,
      format: this.options.format,
      transparent: this.options.transparent,
      bboxSR: this.options.bboxSR,
      imageSR: this.options.imageSR
    };

    if (this.options.layers) {
      params.layers = 'show:' + this.options.layers.join(',');
    }

    if (this.options.layerDefs) {
      params.layerDefs = JSON.stringify(this.options.layerDefs);
    }

    if (this.options.timeOptions) {
      params.timeOptions = JSON.stringify(this.options.timeOptions);
    }

    if (this.options.from && this.options.to) {
      params.time = this.options.from.valueOf() + ',' + this.options.to.valueOf();
    }

    if (this._service.options.token) {
      params.token = this._service.options.token;
    }

    return params;
  },

  /**
   * @param  {Object}  tile
   * @param  {L.Point} tilePoint
   */
  _loadTile: function(tile, tilePoint) {
    tile._layer = this;
    tile.onload = this._tileOnLoad;
    tile.onerror = this._tileOnError;

    this._adjustTilePoint(tilePoint);
    this.getTileUrl(tilePoint, function(err, url) {
      if (err) {
        this._tileOnError.call(tile);
      } else {
        tile.src = url;
      }
    }, tile);

    this.fire('tileloadstart', {
      tile: tile
    });
  },

  /**
   * Async request tile url
   * @param  {L.Point}  tilePoint
   * @param  {Function} callback
   * @param  {Image}    tile
   */
  getTileUrl: function(tilePoint, callback) {
    var map = this._map,
      tileSize = this.options.tileSize,

      nwPoint = tilePoint.multiplyBy(tileSize),
      sePoint = nwPoint.add([tileSize, tileSize]);

    var bounds = new L.LatLngBounds(
      map.unproject(nwPoint, tilePoint.z),
      map.unproject(sePoint, tilePoint.z)
    );
    var size = new L.Point(this.options.tileSize, this.options.tileSize);

    var params = this._buildExportParams(bounds, size);
    this._requestExport(params, bounds, callback);
  },

  /**
   * Export call, json or image straight awy
   * @param  {Object}          params
   * @param  {L.LatLngBounds}  bounds
   * @param  {Function}        callback
   */
  _requestExport: function(params, bounds, callback) {
    if (this.options.f === 'json') {
      this._requests.push(this._service.get('export', params, function(error, response) {
        if (error) {
          callback(error, response);
        } else {
          callback(null, response.href, bounds);
        }
      }, this));
    } else {
      params.f = 'image';
      callback(null, this.options.url + 'export' + L.Util.getParamString(params), bounds);
    }
  },

  /**
   * Smooth redraw, see
   * @see https://github.com/w8r/leaflet-wms-bgbuffer
   * @return {EsriLeaflet.Layers.TiledDynamicMapLayer}
   */
  _redraw: function() {
    if (this._map) {
      if (this.options.redrawBuffer) {
        var front = this._tileContainer;
        this._clearBgBuffer();
        this._tileContainer = this._bgBuffer;
        this._bgBuffer = front;

        this._tiles = {};
        this._tilesToLoad = 0;
        this._tilesTotal = 0;
      } else {
        L.TileLayer.prototype._reset.call(this, {
          hard: true
        });
      }
    }
  },

  /**
   * Override for old IE, just to have bg buffer for tiles
   */
  _initContainer: function() {
    this._animated = this._animated || this.options.redrawBuffer;
    L.TileLayer.prototype._initContainer.call(this);
  },

  /**
   * Bounds or params changed
   */
  _update: function() {
    if (this._map && this._map._animatingZoom) {
      return;
    }
    L.TileLayer.prototype._update.call(this);
  }

});

(function(methods) {
  for (var i = 0, len = methods.length; i < len; i++) {
    EsriLeaflet.Layers.TiledDynamicMapLayer.prototype[methods[i]] =
      EsriLeaflet.Layers.DynamicMapLayer.prototype[methods[i]];
  }
})([
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.getLayers as getLayers */
  'getLayers',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.getLayerDefs as getLayerDefs */
  'getLayerDefs',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.getTimeOptions as getTimeOptions */
  'getTimeOptions',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.metadata as metadata */
  'metadata',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.query as query */
  'query',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.identify as identify */
  'identify',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype.find as find */
  'find',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype._getPopupData as _getPopupData */
  '_getPopupData',
  /** @borrows L.esri.Layers.DynamicMapLayer.prototype._propagateEvent as _propagateEvent */
  '_propagateEvent'
]);

// factory
EsriLeaflet.Layers.tiledDynamicMapLayer =
  EsriLeaflet.tiledDynamicMapLayer = function(url, options) {
    return new EsriLeaflet.Layers.TiledDynamicMapLayer(url, options);
  };
