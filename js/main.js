function wrapper(){

//initialize map
var myMap = L.map('mapid', {center: [46.8797, -110.3626], zoom: 6});

//add tiles
L.tileLayer('https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=d0f7c9187bfe46659b71bb1f9ea9838b', 
{
	attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
	apikey: 'd0f7c9187bfe46659b71bb1f9ea9838b',
	maxZoom: 14,
	minZoom: 5
}).addTo(myMap);

//set geoJson styles
var dStyle = {
    "color": "#50267c",
    "weight": 1,
    "opacity": 0.5
};
var dHighStyle = {
  "color": "#4411ff",
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};

var gStyle = {
    "color": "#b22010",
    "weight": 1,
    "opacity": 0.5
};

var gHighStyle = {
  "color": "#f48275",
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};

//add Daines WSA's
$.getJSON('data/daines.geojson', function(data){

  L.geoJson(data, {

    style: dStyle,

onEachFeature: function(feature, layer){
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + " Acres, " + feature.properties["MANAGER"] + "</p>");
  layer.on("click", function (e){
  	myMap.fitBounds(e.target.getBounds(), {maxZoom: 9});
  });
  layer.on("mouseover",function (e){
    layer.setStyle(dHighStyle);
  });
  layer.on("mouseout", function(e){
    layer.setStyle(dStyle);
  });
}

  }).addTo(myMap);
});

////add Gianforte WSA's
$.getJSON('data/gforte.geojson', function(data){

  L.geoJson(data, {

    style: gStyle,

onEachFeature: function(feature, layer){
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + " Acres, Bureau of Land Management</p>");
  layer.on("click", function (e){
  	myMap.fitBounds(e.target.getBounds(), {maxZoom: 9});
  });
  layer.on("mouseover",function (e){
    layer.setStyle(gHighStyle);
  });
  layer.on("mouseout", function(e){
    layer.setStyle(gStyle);
  });
}

  }).addTo(myMap);
});

//////////////// Linked Bar Chart//////////////////////
var vizW = 350,
    vizH = 400;


var vizBox = d3.select("#vizBox")
                  .append("svg")
                    .attr("class", "vizSvg")
                    .attr("width", vizW)
                    .attr("height", vizH);


//add wsa data
d3.csv("data/wsa_data.csv", function (error, wsaData){
    if(error) throw error;
  
//populate with fake data
    
var fakeAtt = ["Wildness", "Light Pollution", "Noise Pollution", "Mammal", "Charismatic Carnivores"];

for(var att of fakeAtt) {
    for(var wsa of wsaData) {
        wsa[att] = Math.floor(Math.random()*100)*.01;
    }
}

console.log(wsaData);

///dynamic attribute domain finder

var xDom = function(att) {
    var attArray = [];
    for(var wsa of wsaData) {
        attArray.push(wsa[att]);
    }
    return d3.extent(attArray);

};

//dynamic scale generator
var xScaleGen = function(att) {
      return d3.scaleLinear()
                .domain(xDom(att))
                .range([25, 375]);
} ;

//xScale tests
var wildScale = xScaleGen(fakeAtt[0]);
console.log(wildScale(.3));

var xAttScales = fakeAtt.map(function(att){
      return xScaleGen(att);
});

console.log(xAttScales[0](.3));

/// create yScale
var yScale = d3.scaleLinear()
                .domain([0, 4])
                .range([10,340]);


///create circles
for(i=0;i<fakeAtt.length;i++) {

    var att = fakeAtt[i];

    vizBox.selectAll(att)
        .data(wsaData)
        .enter()
        .append("circle")
          .attr("class", "circles")
          .attr("cx", function(d) {
            return xAttScales[i](d[att]);
          })
          .attr("cy", function(d){
            return yScale(i);
          })
          .attr("r", 5);

}



});







///////end wrapper function
};

window.onload = wrapper();