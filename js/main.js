function wrapper(){

//add scroll listener
$("#scrollButton").on("click", function(){
  $('html, body').animate({
    scrollTop: ($('.title2').offset().top - 20)
},500);
})

console.log($("#title2"));

//initialize Leaflet map

var topLeft = [49, -115],
    botRight = [44.295, -105];

var myMap = L.map('mapid').fitBounds([topLeft, botRight]);

var parksDrawn = true;

//add tiles
L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
  maxZoom: 14,
  minZoom: 5
}).addTo(myMap);

var symbolLayer = L.featureGroup();

var color = "#50267c",
    colorHigh = "#4411ff";
    
var style = function(feature){
       var input = feature.properties["MANAME"];
       var fill = colorizer(input,initial);
       return {color: fill,
               weight: 1,
               fillOpacity: .7};
  };


var highStyle = function(feature){
       var input = feature.properties["MANAME"];
       var fill = colorizer(input,initial);

       return {color: fill,
              weight: 1,
               fillOpacity: .5};
};

///////instantiate scales

var scales = {
Wildness: d3.scaleSequential()
            .domain([25,100])
            .interpolator(d3.interpolateGreens),
Darkness: d3.scaleSequential()
                .domain([-10,60])
                .interpolator(d3.interpolateBlues),                
Quietness: d3.scaleSequential()
            .domain([-50,100])
            .interpolator(d3.interpolatePurples),
Carnivore: d3.scaleSequential()
            .domain([0,100])
            .interpolator(d3.interpolateReds),
Mammal: d3.scaleSequential()
            .domain([0,100])
            .interpolator(d3.interpolateOranges),
};

 
var initial = "Wildness";

////function to set color

var colorizer = function(input, att) {

//if input from leaflet, get in d3 form
  if(typeof input == "string") {
    input = d3.select(`.${leafClassy(input).replace("WildernessStudyArea", "")}`).data()[0];
  }

  var scale = scales[att];
  var value = input[att+"Avg"];
  return scale(value);

};

var labelClick = function(d) {
      //get attribute name
      var target = d3.select(this).text(); 
      initial = target;

      console.log(target);
      //change selected button
      d3.selectAll("#button")
      .classed("selected", false);

      d3.selectAll(`#button.${target}`)
          .classed("selected", true);

      //remove previous highlights
      d3.selectAll(".circles")
          .attr("fill", "#bbb")
          .attr("r", 5)
          .attr("fill-opacity", .5);

      //change selected circle color
      d3.select(`g.${target}`).selectAll("circle")
        .attr("r", 6)
        .attr("fill-opacity", .8)
        .attr("fill", function(d){
            return colorizer(d,target);
        });

      //reset map, reexpress symbol colors
      myMap.fitBounds([topLeft, botRight]);

      d3.selectAll(".symbol")
        .attr("fill", function(d){
            var name = d3.select(this).attr("id");
            return colorizer(name, target);
        })

      //recolor json
      jsonLayer.eachLayer(function(layer){
                layer.setStyle(style(layer.feature));
      });


};





////////hacky solution to get latlong bounds for d3 event
var layerKey = {};

var leafZoom = function(key) {
console.log("Start Zoom");

if(myMap.hasLayer(jsonLayer) == false) {
  myMap.removeLayer(symbolLayer);
  myMap.addLayer(jsonLayer);
}

  var layer = layerKey[key][0],
      feature = layerKey[key][1];

  myMap.fitBounds(layer.getBounds(), {maxZoom: 9});
/*
  layer.bindPopup("<h3>" + feature.properties["MANAME"] + 
    "</h3><p>" + d3.format(',')(Math.floor(feature.properties["wsa_data_1"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>").openPopup();
    */

  };


///format wsa names to match d3 data
var leafClass = function(feat) {
  return feat.properties["MANAME"].replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
};

var leafClassy = function(feat) {
  return feat.replace(" Wilderness Study Area", "").replace(/ /g, "").replace("/", "");
}

///click function handler for leaflet
var openPopup = function(e, layer, feature, key) {

  console.log("opening popup now");

  if(e == "key"){
    var layer = layerKey[key][0],
      feature = layerKey[key][1];
  }

  layer.bindPopup("<h3>" + feature.properties["MANAME"] + 
    "</h3><p>" + d3.format(',')(Math.floor(feature.properties["wsa_data_1"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>").openPopup();

};


/////////////add WSA geojsons
$.getJSON('data/wsa.geojson', function(data){

///add proportional circles

//check data
  var wsaData = data.features.sort(function(a,b){
   return b.properties.wsa_data_1 - a.properties.wsa_data_1;
  });

//set w/h of svg and translate
  var w = 30,
      h = 30,
     tx = 6,
     ty = 6;

//make radius scale
var rScale = d3.scaleSqrt()
               .domain(d3.extent(wsaData.map(wsa => wsa.properties["wsa_data_1"])))
               .range([5,15]);
/////////////////////////////////////////////////////////////////////////////
//Circles
/////////////////////////////////////////////////////////////////////////////
symbolLayer.addTo(myMap);

//create markers and add to layergroup
  for(var wsa of wsaData) {
    var name = compressor(wsa.properties["MANAME"]);
    var centroid = d3.geoCentroid(wsa);

    var lat = centroid[0],
        long = centroid[1];

//create feature specific icon
//add marker to layer group so entire group can be targeted on zoom

    var divIcon = L.divIcon({className: name});
    var marker = L.marker([long, lat], {icon: divIcon});
    symbolLayer.addLayer(marker);
}

//add svg's
function addSymbols() {
for(var wsa of wsaData) {
var name = compressor(wsa.properties["MANAME"]);

//append svg to divIcon, add circle symbols
    var symbol = d3.select(`.${name}`)
                  .append("svg")
                  .attr("overflow", "visible")
                  .attr("transform", "translate(" + tx + "," + ty + ")")
                  .attr("width", w)
                  .attr("height", h)
                .append("circle")
                  .attr("class", "symbol")
                  .attr("id", `${name}`)
                  .attr("cx", 0)
                  .attr("cy", 0)
                  .attr("r", function(d){
                      return rScale(wsa.properties["wsa_data_1"]);
                  })
                  .attr("fill", function(d){
                        return colorizer(name,initial);
                      
                  })
                  .attr("fill-opacity", .8)
                  .on("mouseover", function(d){
                    console.log("here");
                    d3.select(this).attr("opacity", .5)
                  })
                  .on("mouseout", function(d){
                    d3.select(this).attr("opacity", .8)
                  })
                  .on("click", function(d){
                      var target = d3.select(this).attr("id").replace("WildernessStudyArea", "");
                      leafZoom(target);
                      setTimeout(function(){
                        openPopup("key", false, false, target)
                      }, 300);
                      dotClickFocus(target);
                      
                  });
  }
};
addSymbols();
//////////////////////////////////////////////////////////////////////////////////////////////
///Add GeoJson

////////////////////////////////////////////add geojson's/////////////////////////////////
  jsonLayer = L.geoJson(data, {

onEachFeature: function(feature, layer){

 //set styles based on attribute
  layer.setStyle(style(feature));


  ///store bounds in map for access by d3 listener
  layerKey[leafClass(feature)] = [layer, feature];

  layer.on("click", function(e){
      leafZoom(compressor(feature.properties["MANAME"]).replace("WildernessStudyArea", ""));
      openPopup(e, layer, feature);
      dotClickFocus(feature.properties["MANAME"]);
  });

  layer.on("mouseover",function (e){
    layer.setStyle(highStyle(feature));
  });

  layer.on("mouseout", function(e){
      layer.setStyle(style(feature));
  });
  
}
  });

/////////////////////////////////////////////////////////////////////////////////////////////////

///add and remove dots and json depending on zoom level. Fires at end of transition
myMap.on("zoomend", function(){

  console.log("map zoom functions here!");
    if(myMap.getZoom() < 8 && myMap.hasLayer(jsonLayer)) {
      myMap.removeLayer(jsonLayer);
    }
    if (myMap.getZoom() >= 8 && myMap.hasLayer(jsonLayer) == false)
    {
        myMap.addLayer(jsonLayer);
    }   
    if(myMap.getZoom() >= 8 && myMap.hasLayer(symbolLayer)) {
      myMap.removeLayer(symbolLayer);
    }
    //leaflet destroys contents of div on remove, repopulate with symbols
    if (myMap.getZoom() < 8 && myMap.hasLayer(symbolLayer) == false)
    {
        myMap.addLayer(symbolLayer);
        addSymbols();
    }   
})

});



//////////////// Linked Dot Plot///////////////////////////////////////////


var vizW = function() {
    return $("#vizBox").width();
};


console.log(vizW());
var vizH = 450; 
if(vizW()<456){
  vizH+=50;
}
console.log(vizH);

var vizBox = d3.select("#vizBox")
                  .style("width", `${vizW()}px`)
                  .style("height", vizH)
                  .append("div")
                    .attr("id", "container")
                  .append("svg")
                    .attr("class", "vizSvg")
                    .attr("width", vizW())
                    .attr("height", vizH);

var title = d3.select("#container")
              .append("div")
              .html(`<div id="title">
      <h2>On Average (Median) </h2>
      <div id="col">
        <p>
        Wilder than <br>
        <span class="Wildness" id="percent">87% </span><br>
        of National Parks<br<

        </p>
      </div>
      <div id="col">
        <p>
        Darker than <br>
        <span class="Darkness" id="percent">44%</span><br>
        of National Parks
      </p>
      </div>
      <div id="col">
        <p>
        Quieter than <br>
        <span class="Quietness" id="percent">56%</span><br>
        of National Parks
      </p>
      </div>

        </div`);

              /*
              <p>Wilder than ${value["WildnessAvg"]}% of National Parks</p>
  <p>Darker than ${value["DarknessAvg"]}% of National Parks</p>
  <p>Quieter than ${value["QuietnessAvg"]}% of National Parks</p>
  */

var compressor = function(str) {
    return str.replace(/ /g, "").replace("/", "").replace("BLM WSA", "").replace("FS WSA", "");
};

////////////////////event functions//////////////////////////////////////////
var dotHover = function(d,dotRef) {

    //select WSA for each variable and add stroke
    vizBox.selectAll(`.${compressor(d["Area"])}`)
                                .attr("stroke", "black")
                                .attr("stroke-opacity", .8)
                                .attr("stroke-width", "1.2px");

    //get reference to variable through parent
    var dotClass = d3.select(dotRef.parentNode).attr("class");
   
  //find x and y of for each circle, position slightly left and up
      for(var att of attributes) {
          var x = d3.select(`.${compressor(att)}`).select(`.${compressor(d["Area"])}`).attr("cx") - 15,
              y =d3.select(`.${compressor(att)}`).select(`.${compressor(d["Area"])}`).attr("cy") - 10;

//create tooltip div
          var hoverTip = d3.select("#container")
                        .append("div")
                          .attr("class", "hover " + compressor(att))
                          .attr("id", "hoverTip");

          //position div above if parks are drawn
          if(parksDrawn){
              if(x> vizW()/2 + 30){
                hoverTip.style("max-width", "20px")
              }
             
            hoverTip.style("left", x + "px")
                      .style("bottom", vizH- y + "px");



          }  
          //position div below if only WSA
          else{
              y += 25;

          hoverTip.style("left", x + "px")
                      .style("top", y + "px");
          }


          //if close to edge move left
          if(x>vizW()-50){
            x-=15;
          }



             //add div content
          if(att == dotClass){
                hoverTip.text(d["Area"] +"\n"+ parseFloat(d[att+"Avg"]).toFixed(0)+"%");
          } else{
                hoverTip.text(parseFloat(d[att+"Avg"]).toFixed(0)+ "%");
          }

            
}
}

//////////click event function

var dotClickFocus = function (wsa,dotRef) {

/////////////////input from leaflet///////////////////
if(typeof wsa == "string") {
var wsa = d3.select(`.${leafClassy(wsa)}`).data()[0];
var dotRef = initial;
}

  console.log(wsa);
  ///remove any already focused
 vizBox.selectAll("circle")
        .classed("strongFocus", false)
        .attr("r", 5)
        .attr("fill-opacity", ".5")
        .attr("fill", "#bbb")
        .attr("stroke-width", "0px");
          
  initial = dotRef;

//change selected circle color
      d3.select(`g.${dotRef}`).selectAll("circle")
        .attr("r", 6)
        .attr("fill-opacity", .8)
        .attr("fill", function(d){
            return colorizer(d,dotRef);
        });

      d3.selectAll(".symbol")
        .attr("fill", function(d){
            var name = d3.select(this).attr("id");
            return colorizer(name, dotRef);
        })

      //recolor json
      jsonLayer.eachLayer(function(layer){
                layer.setStyle(style(layer.feature));
      });

///add new focus
   vizBox.selectAll(`.${compressor(wsa["Area"])}`)
          .classed("strongFocus", true)
          .attr("r", 10)
          .attr("fill-opacity", ".8")
          .attr("fill", function(d){
              var att = $(this).parent().attr("class");
              return colorizer(d,att);
          });

d3.selectAll(".focus").classed("hidden", true);


//switch title
d3.select("#title h2").text(`${wsa["Area"]}`);

//change percent
for(var att of attributes) {
d3.select(`span.${att}`).html(wsa[att+"Avg"]+ "%")
          .style("color", function(){
      return colorizer(wsa, att);
    });

}

};

/////////////////////////////////////////////////////////////////////////////////////
//list of expressed attributes
var attributes = ["Wildness", "Darkness", "Quietness"];
//////////////////////////add wsa data////////////////////////////////

d3.csv("data/wsa.csv", function (error, wsaParksData){
    if(error) throw error;



///////////////////separate wsa and park data//////////////////////
var wsaData = wsaParksData.filter(unit => !unit["Class"].includes("Park"));

for(var wsa of wsaData) {
    wsa["Area"] = wsa["Area"].replace(" BLM WSA", "").replace(" FS WSA", "");
}

var parksData = wsaParksData.filter(unit => unit["Class"].includes("Park"))
                            .filter(unit => unit["Darkness"] != "NA")
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

///dynamic attribute domain finder

var xDom = function(att) {
    var attArray = [];
    for(var wsa of wsaData) {
        attArray.push(wsa[att]);
    }
    //add parks if parksDrawn is true
    if(parksDrawn==true){
    for(var park of parksData){
        attArray.push(park[att]);
    }
  }
    return d3.extent(attArray);
};



//dynamic scale generator
var xScaleGen = function(att) {
      return d3.scaleLinear()
                .domain(xDom(att))
                .range([10, vizW()-10]);
};

//xScale tests
var wildScale = xScaleGen(attributes[0]);

var xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

/// create yScale
var yScale = d3.scaleLinear()
                .domain([0, (attributes.length-1)])
                .range([225, vizH - 30]);

if(vizW()<456){
  yScale.range([275, vizH - 30]);
}

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
  .attr("r", function(d){
        if(att==initial) {
          return 6;
        }
        else{
          return 5;
        }
  })
  .attr("fill", function(d){
        if(att!=initial) {
          return "#bbb";
        }
        else{
          return colorizer(d,initial);
        }
  })
  .attr("fill-opacity", function(d){
        if(att==initial) {
                  return .9;
                }
                else{
                  return .5;
                }
  })
  .on("mouseover", function(d){

    if( $(this).hasClass("strongFocus") ==false) {
      dotHover(d,this);
    }
                
  })
  .on("mouseout", function(d){

    vizBox.selectAll(`.${compressor(d["Area"])}`)
          .attr("stroke", "none");
          d3.selectAll(".hover").remove();

  })
  .on("click", function(d) {
      var att = $(this).parent().attr("class");
      leafZoom(compressor(d["Area"]));
      openPopup("key", false, false, compressor(d["Area"]));
      //openPopup("key", false, false, compressor(d["Area"]));
      dotClickFocus(d,att);
  });

/*
///dotplot buttons
    d3.select("div#container")
        .append("div")
          .attr("class", function(){
                if(att==initial){
                  return att+ " selected";
                }
                else{
                  return att;
                }
          })
          .attr("id", "button")
          .html(`<h4>${att}</h4>`)
          .style("left", `${vizW()/2 - 30}px`)
          .style("top", `${yScale(i)-50}px`)
          .on("click", labelClick);
*/


///map buttons
    
    var mapW = $("#mapContainer").width();
    buttonPadding = 20,
    buttonWidth = mapW/attributes.length- buttonPadding;


    d3.select("div#mapContainer")
        .append("div")
          .attr("class", att)
          .attr("id", "button")
          .html(`<h4>${att}</h4>`)
          .style("width", buttonWidth+"px")
          .style("left", function(){
                var left = i*buttonWidth + i*buttonPadding;
                return left+"px";
          })
          .style("top", "-40px")
          .on("click", labelClick);
         
///variable labels
console.log(vizW());

    d3.select("div#container")
        .append("div")
          .attr("id", "axis")
          .html(`<p>${att}</p>`)
          .style("left", `${vizW()/2 -40}px`)
          .style("top", `${yScale(i)-50}px`);



////////add lines
    d3.select("#container")
              .append("div")
              .attr("id", "line")
                  .style("top", `${yScale(i)+5}px`);

 ///////////add median park values
 /*
    d3.select("#container")
              .append("div")
              .attr("id", "medianPark")
                  .style("width", "2px")
                  .style("height", "10px")
                  .style("top", `${yScale(i)}px`)
                  .style("left", function(d){
                    return `${xAttScales[i](parksAvg[att])}px`;
                  });
                  */


} ////end for loop creating dots for each attribute

var addParks = function() {

parksDrawn = true;
//recreate scales
  xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

for(i=0;i<attributes.length;i++) {

    var att = attributes[i];

////draw parks
vizBox.selectAll(".parks")
      .data(parksData)
      .enter()
      .append("rect")
          .attr("class", function(d){
                return compressor(d["Area"])+" park " + att;
          })
          .attr("width", 9)
          .attr("height", 9)
          .attr("fill", "#bbb")
          .attr("opacity", .5)
          .attr("x", function(d){
            return xAttScales[i](d[att]);
          })
          .attr("y", function(d){
            return yScale(i)+10;
          });

//color percentages
    d3.select(`span.${att}`)
    .style("color", function(){
      console.log(colorizer(wsaData[20],att));
      return colorizer(wsaData[20], att);
    });

  }




//highlight famous parks
var famous = ["Canyon lands National Park",
"Rocky Mountain National Park", "Saguaro National Park"];

for(var park of famous){
//darken
  vizBox.selectAll(`.${compressor(park)}`)
        .attr("stroke", "#000")
        //.attr("stroke-width", .5)
        //.attr("opacity", 1)
        .classed("front", true);

//bring to front
d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
};


vizBox.selectAll(`.${compressor(park)}`)
      .moveToFront();

  for(att of attributes){
//park labels
         d3.select("div#container")
            .append("div")
              .attr("class", "park")
              .attr("id", "famous")
              .style("width", "20px")
              .html(`<p>${park.replace("National Park", "NP").replace("Mountain", "Mtn")}</p>`)
              .style("left", function(){
              var x = d3.select(`.${compressor(park)}.${att}`).attr("x") - 10;
                return x+"px";
              } )
              .style("top", function(){
              var y = parseFloat(d3.select(`.${compressor(park)}.${att}`).attr("y")) - 5;
                return y+"px";
              });
      }
}

///transition circle elements

for(i=0;i<attributes.length;i++) {
    var att = attributes[i];
  d3.select(`g.${att}`)
    .selectAll("circle")
    .transition()
    .duration(600)
    .attr("cx", function(d){
      return xAttScales[i](d[att]);
    });
}

//switch button text
d3.select("div#parkToggle")
    .html(`<h4>WSAs Only</h4>`);

};

///////////////////////////////////////////////////////////////////////////////////

//start with parks
addParks();

//////////////////remove parks function////////////////////////////////
var removeParks = function(){

   parksDrawn = false;

//remove squares
    d3.selectAll(".park").remove();

//recreate scales
  xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

for(i=0;i<attributes.length;i++) {
  var att = attributes[i];

 ///transition circle elements
  d3.select(`g.${att}`)
    .selectAll("circle")
    .transition()
    .duration(600)
    .attr("cx", function(d){
      return xAttScales[i](d[att]);
    });


}

};

//add parks toggle button
        d3.selectAll(".title2 p")
          .on("click", function(){

//only change if button is not active
if(d3.select(this).classed("selected") == false){

//change selected tab
          //change selected
      d3.selectAll(".title2 p")
      .classed("selected", false);

      d3.select(this)
          .classed("selected", true);

              if(parksDrawn==true){
                removeParks();
              }
              else{
                addParks();
              }

            }
          });




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