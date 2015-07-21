describe('L.esri.Layers.TiledDynamicMapLayer', function() {

  function createMap() {
    // create container
    var container = document.createElement('div');

    // give container a width/height
    container.setAttribute('style', 'width:500px; height: 500px;');

    // add contianer to body
    document.body.appendChild(container);

    return L.map(container).setView([37.75, -122.45], 12);
  }

  var url = 'http://services.arcgis.com/mock/arcgis/rest/services/MockMapService/MapServer';
  var layer;
  var server;
  var map;


  beforeEach(function() {
    clock = sinon.useFakeTimers();
    server = sinon.fakeServer.create();
    server.respondWith('GET', new RegExp(
      /http:\/\/services.arcgis.com\/mock\/arcgis\/rest\/services\/MockMapService\/MapServer\/export\?bbox=-?\d+\.\d+%2C-?\d+\.\d+%2C-?\d+\.\d+%2C-?\d+\.\d+&size=500%2C500&dpi=96&format=png24&transparent=true&bboxSR=3857&imageSR=3857&f=json/
    ), JSON.stringify({
      href: 'http://placehold.it/500&text=Image1'
    }));
    layer = L.esri.Layers.tiledDynamicMapLayer(url, {
      f: 'json'
    });
    map = createMap();
    layer.addTo(map);
  });

  afterEach(function() {
    server.restore();
    map.remove();
  });

  it('should have a L.esri.Layers.tiledDynamicMapLayer alias', function() {
    expect(L.esri.Layers.tiledDynamicMapLayer(url)).to.be.instanceof(L.esri.Layers.TiledDynamicMapLayer);
  });

  it('should be a subclass of L.TileLayer', function() {
    expect(L.esri.Layers.tiledDynamicMapLayer(url)).to.be.instanceof(L.TileLayer);
  });

  it('should create a service if not provided', function() {
    expect(layer._service).to.be.instanceof(L.esri.Services.MapService);
  });

  it('should provide a container and a background buffer on add', function() {
    expect(layer._tileContainer).to.be.ok;
    expect(layer._bgBuffer).to.be.ok;
  });

  it('should have async getTileUrl', function() {
    var tileUrl, error;

    var tilePoint = L.point(0, 15);
    tilePoint.z = 15;
    layer.getTileUrl(tilePoint, function(err, url) {
      tileUrl = url;
      expect(tileUrl).to.be.equal(url +
        '/export?bbox=-20037508.342789244%2C19998372.584307235%2C-20035062.357884116%2C20000818.569212355&size=512%2C0&dpi=96&format=png24&transparent=true&bboxSR=3857&imageSR=3857&layers=show%3A2%2C3%2C5%2C7&f=image'
      );
      done();
    });

    clock.tick(151);
    server.respond();

  });

});
