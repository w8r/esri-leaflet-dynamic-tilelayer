(function (factory) {
  //define an AMD module that relies on 'leaflet'
  if (typeof define === 'function' && define.amd) {
    define(['leaflet', 'esri-leaflet'], function (L, EsriLeaflet) {
      return factory(L, EsriLeaflet);
    });
  //define a common js module that relies on 'leaflet'
  } else if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory(require('leaflet'), require('esri-leaflet'));
  }

  if(typeof window !== 'undefined' && window.L){
    factory(window.L, L.esri);
  }
}(function (L, EsriLeaflet) {

EsriLeaflet.Layers.TiledDynamicMapLayer = L.TileLayer.extend({

  options: L.Util.extend({},
    EsriLeaflet.Layers.DynamicMapLayer.prototype.options, {
      redrawBuffer: true
    }),

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
      var sr = map.options.crs.code.split(':')[1];
      this.options.bboxSR = sr;
      this.options.imageSR = sr;
    }

    map.on('zoomstart zoomend', this._onZoomChange, this);
    return L.TileLayer.prototype.onAdd.call(this, map);
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
    EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayers.call(this, layers);
    return this.redraw();
  },

  /**
   * @param {Array.<Object>} layerDefs
   * @return {L.esri.Layers.TiledDynamicMapLayer} self
   */
  setLayerDefs: function(layerDefs) {
    EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayerDefs.call(this, layerDefs);
    return this.redraw();
  },

  /**
   * @param {Object} timeOptions
   * @return {L.esri.Layers.TiledDynamicMapLayer} self
   */
  setTimeOptions: function(timeOptions) {
    EsriLeaflet.Layers.DynamicMapLayer.prototype.setTimeOptions.call(this, timeOptions);
    return this.redraw();
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
    var nw = this._map.options.crs.project(bounds.getNorthWest());
    var se = this._map.options.crs.project(bounds.getSouthEast());

    var params = {
      bbox: [se.x, se.y, nw.x, nw.y].join(','),
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
      tile.src = url;
    });

    this.fire('tileloadstart', {
      tile: tile
    });
  },

  /**
   * Async request tile url
   * @param  {L.Point}  tilePoint
   * @param  {Function} callback
   */
  getTileUrl: function(tilePoint, callback) { // (Point, Number) -> String
    var map = this._map,
      tileSize = this.options.tileSize,

      nwPoint = tilePoint.multiplyBy(tileSize),
      sePoint = nwPoint.add([tileSize, tileSize]);

    var bounds = new L.LatLngBounds(map.unproject(nwPoint, tilePoint.z),
      map.unproject(sePoint, tilePoint.z));
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
        callback(null, response.href, bounds);
      }, this));
    } else {
      params.f = 'image';
      callback(null, this.options.url + 'export' + L.Util.getParamString(params), bounds);
    }
  },

  redraw: function() {
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
        this._reset({
          hard: true
        });
      }

      this._update();
    }
    return this;
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
EsriLeaflet.tiledDynamicMapLayer =
EsriLeaflet.Layers.tiledDynamicMapLayer = function(url, options) {
  return new EsriLeaflet.Layers.TiledDynamicMapLayer(url, options);
};


  return EsriLeaflet;
}));
//# sourceMappingURL=esri-leaflet-dynamic-tilelayer-src.js.map