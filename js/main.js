function wrapper(){

//initialize Leaflet map

var topLeft = [49.052589, -116.223559],
    botRight = [44.895140, -103.927112];

var myMap = L.map('mapid').fitBounds([topLeft, botRight]);

/*'https://{s}.tile.thunderforest.com/landscape/{z}/{x}/{y}.png?apikey=d0f7c9187bfe46659b71bb1f9ea9838b',
{
  attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>',
  apikey: 'd0f7c9187bfe46659b71bb1f9ea9838b',
  maxZoom: 14,
  minZoom: 5
}
*/



//add tiles
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
	maxZoom: 14,
	minZoom: 5
}).addTo(myMap);

var fsColor = "#50267c",
    fsColorHigh = "#4411ff",
    blmColor = "#b22010",
    blmColorHigh = "#f48275";


var dStyle = {
    "color": fsColor,
    "weight": 1
  };
var dHighStyle = {
  "color":fsColorHigh,
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};

var gStyle = {
    "color": blmColor,
    "weight": 1,
    "opacity": 0.5
};

var gHighStyle = {
  "color": blmColorHigh,
  "weight": 1,
  "opacity": 0.5,
  "fillOpacity:": 0.4
};

////////hacky solution to get latlong bounds for d3 event
var layerKey = {};

var leafZoom = function(key) {
  var layer = layerKey[key][0],
      feature = layerKey[key][1];


  myMap.fitBounds(layer.getBounds(), {maxZoom: 9});

  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
    "</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>").openPopup();
  };

///format wsa names to match d3 data
var leafClass = function(feat) {
  return feat.properties["MANAME"].replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
};

var leafClassy = function(feat) {
  return feat.replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
}

///click function handler for leaflet
var onClick = function(e, layer) {
  myMap.fitBounds(e.target.getBounds(), {maxZoom: 9});
};


/////////////add Daines WSA's
$.getJSON('data/daines.geojson', function(data){

  L.geoJson(data, {

    style: dStyle,

onEachFeature: function(feature, layer){

  ///store bounds in map for access by d3 listener
  layerKey[leafClass(feature)] = [layer, feature];

  //set layer style

  ///add basic Leaflet popup
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>");

  layer.on("click", function(e){
      onClick(e, layer);
      console.log(feature.properties["MANAME"]);
      dotClickFocus(feature.properties["MANAME"]);
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

/////////////////add Gianforte WSA's
$.getJSON('data/gforte.geojson', function(data){

  L.geoJson(data, {

    style: gStyle,

onEachFeature: function(feature, layer){
  layerKey[leafClass(feature)] = [layer, feature];
  layer.bindPopup("<h3>" + feature.properties["SourceName"] + 
  	"</h3><p>" + d3.format(',')(Math.floor(feature.properties["ACRES"])) + " Acres, Bureau of Land Management</p>");
  layer.on("click", function(e){
      onClick(e, layer);
      dotClickFocus(feature.properties["MANAME"]);
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


//////////////// Linked Dot Plot///////////////////////////////////////////


var vizW = function() {
    return $("#vizBox").width();
};

var vizH = 450; 

var vizBox = d3.select("#vizBox")
                  .style("width", `${vizW()}px`)
                  .style("height", vizH)
                  .append("div")
                    .attr("id", "container")
                  .append("svg")
                    .attr("class", "vizSvg")
                    .attr("width", vizW())
                    .attr("height", vizH);
                    

var photo = d3.select("#container")
              .append("div")
                .attr("id", "photo")
                .html(`<img src="img/TerryBadlands.jpg">`)
                .style("width", "50%")
                .style("height", "250px");

var title = d3.select("#container")
              .append("div")
              .html("<h2>How do Wilderness Study Areas Compare?</h2>")
                .attr("id", "title");

var compressor = function(str) {
    return str.replace(/ /g, "").replace("/", "").replace("BLM WSA", "").replace("FS WSA", "");
};


////////////////////event functions//////////////////////////////////////////
var dotHover = function(wsa) {



      for(var att of attributes) {
          var x = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cx") - 15,
              y = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cy") - 20;



          var hoverTip = d3.select("#container")
                        .append("div")
                          .attr("class", "hover " + compressor(att))
                          .attr("id", "hoverTip")
                          .style("left", x + "px")
                          .style("top", y + "px");

          if(att == "Wildness") {
              if(x> vizW()/2+30){
                y += 35;

              }
              hoverTip.style("left", x + "px")
                      .style("top", y + "px")
                  .text(wsa["Area"] +"\n"+ parseFloat(wsa[att]).toFixed(2));
          }
          else {
              hoverTip.text(parseFloat(wsa[att]).toFixed(2));
            }


}
}

//////////click event function

var dotClickFocus = function (wsa) {


/////////////////input from leaflet///////////////////
if(typeof wsa == "string") {

var value = d3.select(`.${leafClassy(wsa)}`).data()[0];
console.log(value);

  ///remove any already focused
  vizBox.selectAll("circle")
          .classed("strongFocus", false)
          .attr("r", 5)
          .attr("opacity", ".5")
          .attr("fill", "#bbb");

///add new focus
  vizBox.selectAll(`.${leafClassy(wsa)}`)
          .classed("strongFocus", true)
          .attr("r", 10)
          .attr("opacity", ".8")
          .attr("fill", function(d){
              if(value["Class"] == "FS_WSA") {
                      return fsColor;
                  }
                  else {
                      return blmColor;
                  }
          });


d3.selectAll(".focus").classed("hidden", true);


//add focus labels
for(var att of attributes) {
    var x = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).attr("cx") - 20,
        y = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).attr("cy") - 35;

    var toolTip = d3.select("#container")
                  .append("div")
                    .attr("class", "focus " + compressor(att))
                    .attr("id", "toolTip")
                    .style("left", x + "px")
                    .style("top", y + "px");


var value = d3.select(`.${compressor(att)}`).select(`.${leafClassy(wsa)}`).data()[0];
var toolText = toolTip.text(parseFloat(value[att]).toFixed(2));


}

///remove photo and add selected
d3.select("#photo").html(`<img src="img/${leafClassy(wsa)}.jpg">`);

//switch title
d3.select("#title").html(`<h2>${wsa}</h2>
  <p>Wilder than ${value["WildnessAvg"]}% of National Parks</p>
  <p>Darker than ${value["Light PollutionAvg"]}% of National Parks</p>
  <p>Quieter than ${value["Noise PollutionAvg"]}% of National Parks</p>
  `);


console.log(value["Area"]);
console.log(wsa);


/////////////////input from d3//////////////////////////
} else {
  ///remove any already focused
 vizBox.selectAll("circle")
        .classed("strongFocus", false)
        .attr("r", 5)
        .attr("opacity", ".5")
        .attr("fill", "#bbb");
          


///add new focus
   vizBox.selectAll(`.${compressor(wsa["Area"])}`)
          .classed("strongFocus", true)
          .attr("r", 10)
          .attr("opacity", ".8")
          .attr("fill", function(wsa){
              if(wsa["Class"] == "FS_WSA") {
                      return fsColor;
                  }
                  else {
                      return blmColor;
                  }
          });

d3.selectAll(".focus").classed("hidden", true);


//add focus labels
for(var att of attributes) {
    var x = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cx") - 20,
        y = d3.select(`.${compressor(att)}`).select(`.${compressor(wsa["Area"])}`).attr("cy") - 35;

    var toolTip = d3.select("#container")
                  .append("div")
                    .attr("class", "focus " + compressor(att))
                    .attr("id", "toolTip")
                    .style("left", x + "px")
                    .style("top", y + "px");

        toolTip.text(parseFloat(wsa[att]).toFixed(2));

}

///remove photo and add selected
d3.select("#photo").html(`<img src="img/${compressor(wsa["Area"])}.jpg">`);

//switch title
d3.select("#title").html(`<h2>${wsa["Area"]} Wilderness Study Area</h2>
  <p>Wilder than ${wsa["WildnessAvg"]}% of National Parks</p>
  <p>Darker than ${wsa["Light PollutionAvg"]}% of National Parks</p>
  <p>Quieter than ${wsa["Noise PollutionAvg"]}% of National Parks</p>
  `);
}


};


//list of expressed attributes
var attributes = ["Wildness", "Light Pollution", "Noise Pollution"];
//////////////////////////add wsa data////////////////////////////////

d3.csv("data/wsa.csv", function (error, wsaParksData){
    if(error) throw error;



///////////////////separate wsa and park data//////////////////////
var wsaData = wsaParksData.filter(unit => !unit["Class"].includes("Park"));

for(var wsa of wsaData) {
    wsa["Area"] = wsa["Area"].replace(" BLM WSA", "").replace(" FS WSA", "");
}

var parksData = wsaParksData.filter(unit => unit["Class"].includes("Park"))
                            .filter(unit => unit["Light Pollution"] != "NA")
                            .filter(unit => unit["Area"] != "Isle Royale National Park");



//////////calculate averages for park data///////////
var parksAvg = {};
for(var att of attributes){

    var sorted = parksData.sort(function(a,b) {
        return a[att] - b[att];
    });


////calculate percentile of wsa compared to parks
for(var wsa of wsaData) {

///store name
    var key = wsa["Area"];
    var keyFinder = function(zone){
      return zone["Area"] == key ;
    };
///add to parks
    sorted.push(wsa);

//resort with wsa added
    sorted.sort(function(a,b){
      return a[att] - b[att];
    });

//find index of wsa
    var index = sorted.findIndex(keyFinder);
  
//remove wsa from parks
    sorted.splice(index, 1);

//add avg as att to wsaData
    wsa[att+"Avg"] =((index-1)/sorted.length*100).toFixed();
}

    var findMedian = function(arr) {
      if(arr.length%2 != 0) {
        return arr[Math.ceil(arr.length/2)][att];
      }
      else {
        return ( parseFloat(arr[(arr.length/2)][att]) + parseFloat(arr[arr.length/2 + 1][att])) / 2;
      }
    };


    parksAvg[att] = findMedian(sorted);

}

console.log(wsaData);
console.log(parksData);
console.log(parksAvg);

///dynamic attribute domain finder

var xDom = function(att) {
    var attArray = [];
    for(var wsa of wsaData) {
        attArray.push(wsa[att]);
    }
    attArray.push(parksAvg[att]);
    return d3.extent(attArray);

};

//dynamic scale generator
var xScaleGen = function(att) {
      return d3.scaleLinear()
                .domain(xDom(att))
                .range([10, vizW()-10]);
} ;

//xScale tests
var wildScale = xScaleGen(attributes[0]);

var xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

/// create yScale
var yScale = d3.scaleLinear()
                .domain([0, (attributes.length-1)])
                .range([275, vizH - 30]);

///////////////////////create circles
for(i=0;i<attributes.length;i++) {

    var att = attributes[i];

//sort data so drawing order is right to left
    var sorted = wsaData.sort(function(a,b) {
        return b[att] - a[att];
    });

////draw dots
vizBox.append("g")
  .attr("class", compressor(att))
.selectAll("circle")
.data(sorted)
.enter()
.append("circle")
  .attr("class", function(d) {
    return "circles " + compressor(d["Area"]);
    })
  .attr("cx", function(d) {
    return xAttScales[i](d[att]);
  })
  .attr("cy", function(d){
    return yScale(i)-5;
  })
  .attr("r", 5)
  .attr("fill", "#bbb")
  .attr("opacity", ".5")
  .on("mouseover", function(d){

    if($(this).hasClass("strongFocus")) {}

    else {dotHover(d);
                vizBox.selectAll(`.${compressor(d["Area"])}`)
                                .attr("stroke", function(d){
                      if(d["Class"] == "FS_WSA") {
                          return fsColor;
                      }
                      else {
                          return blmColor;
                      }
                                })
                                .attr("stroke-width", "2px");}
                
  })
  .on("mouseout", function(d){

    vizBox.selectAll(`.${compressor(d["Area"])}`)
          .attr("stroke", "none");
          d3.selectAll(".hover").remove();

  })
  .on("click", function(d) {
      dotClickFocus(d);
      leafZoom(compressor(d["Area"]));
  });




///add Labels
  vizBox.select(`.${compressor(att)}`)
          .append("text")
          .text(function(d){
              if(att == "Light Pollution") {
                return "Darkness";
              }
              else if(att == "Noise Pollution") {
                return "Quietness";
              }
              else {
                return att;
              }
          })
              .attr("class", "label")
              .attr("x", `${vizW()/2}`)
              .attr("y", function(d){
                return yScale(i)+25;
              })
              .attr("text-anchor", "middle");

////////add lines
    d3.select("#container")
              .append("div")
              .attr("id", "line")
                  .style("top", `${yScale(i)+5}px`);

 ///////////add median park values
    d3.select("#container")
              .append("div")
              .attr("id", "medianPark")
                  .style("width", "2px")
                  .style("height", "10px")
                  .style("top", `${yScale(i)}px`)
                  .style("left", function(d){
                    return `${xAttScales[i](parksAvg[att])}px`;
                  });



} ////end for loop creating dots for each attribute




}); ///end d3 callback function


//Variable Descriptions.
/*
Wildness: Wildness is calculated using human modification data based on land cover,
human population density, roads, and other mapped data on ecological condition. Data are scaled from
0(high degree of human modification) to 1(no measured human modification).

Darkness: Light pollution represents satellite-measured light intensity during the night from the Visible
 Infrared Imaging Radiometer Suite (VIIRS) nighttime lights data. This mapped dataset
serves as a measure of the intactness of the night sky. Higher values represent more intense light
pollution and thus lower wildland quality and greater ecological impacts.

Quietness: mapped data of human-generated noise pollution is based on field observations and a spatial 
model using landscape features that influence sound propagation. Greater intensity of human
 noises (higher predicted dBA) is associated with reduced wildland quality and greater ecological impacts.


*/



///////end wrapper function
};

window.onload = wrapper();