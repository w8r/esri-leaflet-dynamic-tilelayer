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


EsriLeaflet.Layers.TiledDynamicMapLayer=L.TileLayer.extend({options:L.Util.extend({},EsriLeaflet.Layers.DynamicMapLayer.prototype.options,{redrawBuffer:!0}),_requests:[],initialize:function(a,b){L.TileLayer.prototype.initialize.call(this,a,b),EsriLeaflet.DynamicMapLayer.prototype.initialize.call(this,a,b)},onAdd:function(a){if(a.options.crs&&a.options.crs.code){var b=a.options.crs.code.split(":")[1];this.options.bboxSR=b,this.options.imageSR=b}return a.on("zoomstart zoomend",this._onZoomChange,this),L.TileLayer.prototype.onAdd.call(this,a)},onRemove:function(a){a.off("zoomstart zoomend",this._onZoomChange,this),L.TileLayer.prototype.onRemove.call(this,a),EsriLeaflet.DynamicMapLayer.prototype.onRemove.call(this,a)},setLayers:function(a){return EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayers.call(this,a),this.redraw()},setLayerDefs:function(a){return EsriLeaflet.Layers.DynamicMapLayer.prototype.setLayerDefs.call(this,a),this.redraw()},setTimeOptions:function(a){return EsriLeaflet.Layers.DynamicMapLayer.prototype.setTimeOptions.call(this,a),this.redraw()},_onZoomChange:function(a){this._zooming="zoomstart"===a.type},_buildExportParams:function(a,b){var c=this._map.options.crs.project(a.getNorthWest()),d=this._map.options.crs.project(a.getSouthEast()),e={bbox:[d.x,d.y,c.x,c.y].join(","),size:b.x+","+b.y,dpi:96,format:this.options.format,transparent:this.options.transparent,bboxSR:this.options.bboxSR,imageSR:this.options.imageSR};return this.options.layers&&(e.layers="show:"+this.options.layers.join(",")),this.options.layerDefs&&(e.layerDefs=JSON.stringify(this.options.layerDefs)),this.options.timeOptions&&(e.timeOptions=JSON.stringify(this.options.timeOptions)),this.options.from&&this.options.to&&(e.time=this.options.from.valueOf()+","+this.options.to.valueOf()),this._service.options.token&&(e.token=this._service.options.token),e},_loadTile:function(a,b){a._layer=this,a.onload=this._tileOnLoad,a.onerror=this._tileOnError,this._adjustTilePoint(b),this.getTileUrl(b,function(b,c){a.src=c}),this.fire("tileloadstart",{tile:a})},getTileUrl:function(a,b){var c=this._map,d=this.options.tileSize,e=a.multiplyBy(d),f=e.add([d,d]),g=new L.LatLngBounds(c.unproject(e,a.z),c.unproject(f,a.z)),h=new L.Point(this.options.tileSize,this.options.tileSize),i=this._buildExportParams(g,h);this._requestExport(i,g,b)},_requestExport:function(a,b,c){"json"===this.options.f?this._requests.push(this._service.get("export",a,function(a,d){c(null,d.href,b)},this)):(a.f="image",c(null,this.options.url+"export"+L.Util.getParamString(a),b))},redraw:function(){if(this._map){if(this.options.redrawBuffer){var a=this._tileContainer;this._clearBgBuffer(),this._tileContainer=this._bgBuffer,this._bgBuffer=a,this._tiles={},this._tilesToLoad=0,this._tilesTotal=0}else this._reset({hard:!0});this._update()}return this},_update:function(){this._map&&this._map._animatingZoom||L.TileLayer.prototype._update.call(this)}}),function(a){for(var b=0,c=a.length;c>b;b++)EsriLeaflet.Layers.TiledDynamicMapLayer.prototype[a[b]]=EsriLeaflet.Layers.DynamicMapLayer.prototype[a[b]]}(["getLayers","getLayerDefs","getTimeOptions","metadata","query","identify","find","_getPopupData","_propagateEvent"]),EsriLeaflet.tiledDynamicMapLayer=EsriLeaflet.Layers.tiledDynamicMapLayer=function(a,b){return new EsriLeaflet.Layers.TiledDynamicMapLayer(a,b)};
//# sourceMappingURL=esri-leaflet-dynamic-tilelayer.js.map

  return EsriLeaflet;
}));