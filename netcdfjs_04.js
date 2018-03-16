
var projectionsList = [
  {name: "Natural Earth", projection: d3.geoNaturalEarth()},
  {name: "Robinson", projection: d3.geoRobinson()},
  {name: "Sinu-Mollweide", projection: d3.geoSinuMollweide()},
  {name: "Aitoff", projection: d3.geoAitoff()},
  {name: "Boggs", projection: d3.geoBoggs()},
  {name: "Equirectangular (Plate Carree)", projection: d3.geoEquirectangular()},
  {name: "Mollweide", projection: d3.geoMollweide().scale(165)},
  {name: "Sinusoidal", projection: d3.geoSinusoidal()},
  {name: "Orthographic", projection: d3.geoOrthographic()}
];

var projectionSelected = projectionsList[0]; 
var lon0 = lat0 = 0.;

var urlpath =  "etopo60_2.nc"
var reader;
var values;

var oReq = new XMLHttpRequest();
oReq.open("GET", urlpath, true);
oReq.responseType = "blob";

oReq.onload = function(oEvent) {
  var blob = oReq.response;
  reader_url = new FileReader();
  
  reader_url.onload = function(e) {
  //====================================================================================
    reader = new netcdfjs(this.result);

    values = reader.getDataVariable('ROSE');
    var isize = reader.dimensions[0].size;
    var jsize = reader.dimensions[1].size;;

    var dim0Name = reader.dimensions[0].name;
    var dim1Name = reader.dimensions[1].name;
    axis0 = reader.getDataVariable(dim0Name);
    axis1 = reader.getDataVariable(dim1Name);

    console.log(reader.variables);
    console.log(reader.dimensions);
    console.log(values.length);
    //console.log(axis0);

    values = nj.array(values).reshape(jsize,isize);		//  a matrix with n rows and m columns, shape will be [n,m]. 
    values = values.slice([null, null, -1],null); 
    values = values.flatten().tolist();

//---------------------------------------
function redraw(lon0, lat0, projection) {

  var color = d3.scaleSequential(d3.interpolatePlasma)		// https://github.com/d3/d3-scale-chromatic
      .domain(d3.extent(values));

  var projection = projection.projection
      .precision(0.1)
      .rotate([lon0, lat0, 0]);

  var path = d3.geoPath(projection);

  var graticule = d3.geoGraticule();

  var contours = d3.contours()
      .smooth(true)
      .size([isize, jsize]);

  var svg = d3.select("#map1");
  svg.selectAll("*").remove();
  var g = svg.append("g");

  svg.call(d3.zoom()
    .scaleExtent([1 / 2, 8])
    .on("zoom", zoomed));

  function zoomed() {
    g.attr("transform", d3.event.transform);
  }

  g.attr("class", "contour-stroke")
   .selectAll("path")
   .data(contours(values).map(invert))
   .enter().append("path")
   .attr("fill", function(d) { return color(d.value); })
   .attr("d", path);

  function invert(d) {
    var shared = {};
    var p = {
      type: "Polygon",
      coordinates: d3.merge(d.coordinates.map(function(polygon) {
        return polygon.map(function(ring) {
          return ring.map(function(point) {
            return [point[0] / isize * 360 - 180, 90 - point[1] / jsize * 180];
          }).reverse();
        });
      }))
    };
    // Record the y-intersections with the antimeridian.
    p.coordinates.forEach(function(ring) {
      ring.forEach(function(p) {
        if (p[0] === -180) shared[p[1]] |= 1;
        else if (p[0] === 180) shared[p[1]] |= 2;
      });
    });
    // Offset any unshared antimeridian points to prevent their stitching.
    p.coordinates.forEach(function(ring) {
      ring.forEach(function(p) {
        if ((p[0] === -180 || p[0] === 180) && shared[p[1]] !== 3) {
          p[0] = p[0] === -180 ? -179.9995 : 179.9995;
        }
      });
    });

    p = d3.geoStitch(p);

    // If the MultiPolygon is empty, treat it as the Sphere.
    return p.coordinates.length
        ? {type: "Polygon", coordinates: p.coordinates, value: d.value}
        : {type: "Sphere", value: d.value};
  }

  g.append("path")
    .datum(graticule)
    .attr("class", "graticule")
    .attr("d", path);

  // https://github.com/topojson/world-atlas
  // https://unpkg.com/world-atlas@1/world/110m.json
  d3.json("world-110m.json", function(error, world) {
  	if (error) throw error;
  		g.insert("path", ".graticule")
      			.datum(topojson.feature(world, world.objects.land))
      			.attr("class", "land")
      			.attr("d", path);
	});

}

//---------------------------------------
var menu = d3.select("#projection-menu")
    .on("change", projectionChanged);

menu.selectAll("option")
    .data(projectionsList)
  .enter().append("option")
    .text(function(d) { return d.name; });

function projectionChanged() {
  var color = d3.scaleSequential(d3.interpolateViridis).domain(d3.extent(values));
  g.selectAll("path").attr("fill", new_color);
  projectionSelected = projectionsList[this.selectedIndex];
  redraw(lon0, lat0, projectionSelected);
}

//---------------------------------------
d3.select("#lon0").on("input", function() {
  lon0 = +this.value;
  d3.select("#lon0-value").text(lon0);
  d3.select("#lon0").property("value", lon0);
  redraw(lon0, lat0, projectionSelected);
});

//---------------------------------------
d3.select("#lat0").on("input", function() {
  lat0 = +this.value;
  d3.select("#lat0-value").text(lat0);
  d3.select("#lat0").property("value", lat0);
  redraw(lon0, lat0, projectionSelected);
});

//---------------------------------------
redraw(lon0, lat0, projectionSelected);

  //====================================================================================
  }
      
  reader_url.readAsArrayBuffer(blob);
  
};
oReq.send(); //start process

