EsriLeaflet.Layers.TiledDynamicMapLayer = L.TileLayer.extend({

  options: L.Util.extend({}, EsriLeaflet.Layers.DynamicMapLayer.prototype.options),

  initialize: function(url, options) {
    L.TileLayer.prototype.initialize.call(this, url, options);
    EsriLeaflet.DynamicMapLayer.prototype.initialize.call(this, url, options);
  },

  onAdd: function(map) {
    if (map.options.crs && map.options.crs.code) {
      var sr = map.options.crs.code.split(':')[1];
      this.options.bboxSR = sr;
      this.options.imageSR = sr;
    }
    return L.TileLayer.prototype.onAdd.call(this, map);
  },

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

  _loadTile: function(tile, tilePoint) {
    tile._layer = this;
    tile.onload = this._tileOnLoad;
    tile.onerror = this._tileOnError;

    this._adjustTilePoint(tilePoint);
    this.getTileUrl(tilePoint, function(err, url) {
      tile.src = url;
    });

    this.fire('tileloadstart', {
      tile: tile //,
        //url: tile.src
    });
  },

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

  _requestExport: function(params, bounds, callback) {
    if (this.options.f === 'json') {
      this._service.get('export', params, function(error, response) {
        callback(null, response.href, bounds);
      }, this);
    } else {
      params.f = 'image';
      this._renderImage(this.options.url + 'export' + L.Util.getParamString(params), bounds);
    }
  }

});

(function(methods) {
  for (var i = 0, len = methods.length; i < len; i++) {
    EsriLeaflet.Layers.TiledDynamicMapLayer.prototype[methods[i]] =
      EsriLeaflet.Layers.DynamicMapLayer.prototype[methods[i]];
  }
})([
  'getLayers',
  'setLayers',
  'getLayerDefs',
  'setLayerDefs',
  'getTimeOptions',
  'setTimeOptions',
  'metadata',
  'query',
  'identify',
  'find',
  '_getPopupData',
  '_propagateEvent'
]);

EsriLeaflet.tiledDynamicMapLayer = function(url, options) {
  return new EsriLeaflet.Layers.TiledDynamicMapLayer(url, options);
};
