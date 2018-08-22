function wrapper(){

var parksDrawn = true;
var selectedWsa;
var selectedDotRef;
var addParks;
var removeParks;
var dotClickFocus;
//list of expressed attributes
var attributes = ["Wildness", "Darkness", "Quietness"];

var initial = "Wildness";
//to store key for leaflet/d3 switching
var layerKey = {};

//add scroll listener
$("#scrollButton").on("click", function(){
  $('html, body').animate({
    scrollTop: ($('.title2').offset().top - 20)
},500);
})


//utility function for formatting strings
var comp = function(str) {
return str.replace(/ /g, "").replace(/\//g, "").replace("BLM WSA", "").replace("FS WSA", "").replace("WildernessStudyArea", "");
};

//////////////////styling functions//////////////////////////////////////////////////////////////////////////////////
  
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

////function to set color

var colorizer = function(input, att) {

//if input from leaflet, get in d3 form
  if(typeof input == "string") {
    input = d3.select(`.${comp(input)}`).data()[0];
  }

  var scale = scales[att];
  var value = input[att+"Avg"];
  return scale(value);

};

///////////////////////
/////interaction listener functions
////////////////
///////////////////////////////////////////////////////////////
var labelClick = function(d) {

  console.log(d);
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

////////////////////////////////////////////////////////////////////////

var leafZoom = function(key) {

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
//////////////////////////////////////////////////////////////////////////

var openPopup = function(e, layer, feature, key) {

  if(e == "key"){
    var layer = layerKey[key][0],
      feature = layerKey[key][1];
  }

  layer.bindPopup("<h3>" + feature.properties["MANAME"] + 
    "</h3><p>" + d3.format(',')(Math.floor(feature.properties["wsa_data_1"])) + 
    " Acres, " + feature.properties["MANAGER"] + "</p>").openPopup();

};


////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//////////////// Linked Dot Plot///////////////////////////////////////////

var vizW = function() {
    return $("#vizBox").width();
};

var vizH = 450; 
if(vizW()<456){
  vizH+=50;
}

var yScale = d3.scaleLinear()
                .domain([0, (attributes.length-1)])
                .range([225, vizH - 30]);

if(vizW()<456){
  yScale.range([275, vizH - 30]);
}

var dotSvg = d3.select("#vizBox")
                  .style("width", `${vizW()}px`)
                  .style("height", vizH)
                  .append("div")
                    .attr("id", "container")
                  .append("svg")
                    .attr("class", "vizSvg")
                    .attr("width", vizW())
                    .attr("height", vizH);


//////////////////////////add wsa data////////////////////////////////

d3.csv("data/wsa.csv", function (error, wsaParksData){
    if(error) throw error;

////////////////////////////////////////////////////////////////////
/////////Data Cleaning and Sorting////////////////////////////////////////////////////////////////////////////////

///////////////////separate wsa and park data//////////////////////
var wsaData = wsaParksData.filter(unit => !unit["Class"].includes("Park"));

for(var wsa of wsaData) {
    wsa["Area"] = wsa["Area"].replace(" BLM WSA", "").replace(" FS WSA", "");
}

var parksData = wsaParksData.filter(unit => unit["Class"].includes("Park"))
                            .filter(unit => unit["Darkness"] != "NA")
                            .filter(unit => unit["Area"] != "Isle Royale National Park");


for(var att of attributes){
    ////calculate percentile of wsa compared to parks
    for(var wsa of wsaData) {
        var parkCounter = 0;
        for(var park of parksData){
            if(wsa[att] > park[att]){
              parkCounter+=1;
            }
        }
        //add park percentile attribute
        wsa[att+"Avg"]= (parkCounter/parksData.length*100).toFixed();
    ////calculate wsa percentile relative to other wsa
        var wsaCounter = 0;
        for(var other of wsaData){
            if(wsa[att] > other[att]){
              wsaCounter+=1;
            }
        }
        //add wsa percentile attribute
        wsa[att+"WsaAvg"]= (wsaCounter/(wsaData.length-1)*100).toFixed();

}
}

console.log(wsaData);
console.log(parksData);
/////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////creating x scale(inside ajax because xScale depends of data/////////////////////////////////////////////////////////////////////////////////

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

//create scale for each attribute
var xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

///////////////////////draw dots////////////////////////////////////////////////////////////////////////////////////
for(i=0;i<attributes.length;i++) {

    var att = attributes[i];

//sort data so drawing order is right to left
    var sorted = wsaData.sort(function(a,b) {
        return b[att] - a[att];
    });

dotSvg.append("g")
  .attr("class", comp(att))
.selectAll("circle")
.data(sorted)
.enter()
.append("circle")
  .attr("class", function(d) {
    return "circles " + comp(d["Area"]);
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

    dotSvg.selectAll(`.${comp(d["Area"])}`)
          .attr("stroke", "none");
          d3.selectAll(".hover").remove();

  })
  .on("click touchstart", function(d) {
      var att = $(this).parent().attr("class");
      leafZoom(comp(d["Area"]));
      openPopup("key", false, false, comp(d["Area"]));
      //openPopup("key", false, false, comp(d["Area"]));
      dotClickFocus(d,att);
  });

////////////////////event functions///////////////////////////////////////////////////////////////
var dotHover = function(d,dotRef) {

    //select WSA for each variable and add stroke
    dotSvg.selectAll(`.${comp(d["Area"])}`)
                                .attr("stroke", "black")
                                .attr("stroke-opacity", .8)
                                .attr("stroke-width", "1.2px");

    //get reference to variable through parent
    var dotClass = d3.select(dotRef.parentNode).attr("class");
   
  //find x and y of for each circle, position slightly left and up
      for(var att of attributes) {
          var x = d3.select(`.${att}`).select(`.${comp(d["Area"])}`).attr("cx") - 15,
              y =d3.select(`.${att}`).select(`.${comp(d["Area"])}`).attr("cy") - 10;

//create tooltip div
          var hoverTip = d3.select("#container")
                        .append("div")
                          .attr("class", "hover " + att)
                          .attr("id", "hoverTip");

          //if close to edge move left
          if(x>vizW()-50){
            x-=15;
          }

          //position div above if parks are drawn
          if(parksDrawn){
              hoverTip.style("left", x + "px")
                      .style("bottom", vizH- y + "px");

              if(x> vizW()/2 + 30){
                hoverTip.style("max-width", "20px")
              }    
          }  
          //position div below if only WSA
          else{
              y += 25;
          hoverTip.style("left", x + "px")
                  .style("top", y + "px");
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

dotClickFocus = function (wsa,dotRef) {

/////////////////input from leaflet///////////////////
if(typeof wsa == "string") {
var wsa = d3.select(`circle.${comp(wsa)}`).data()[0];
var dotRef = initial;
}

selectedWsa = wsa;
selectedDotRef = dotRef;

  ///remove any already focused
 dotSvg.selectAll("circle")
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
   dotSvg.selectAll(`circle.${comp(wsa["Area"])}`)
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

//if text unchanged change 
var percentOf = d3.select("span.state").text();
console.log(percentOf);
console.log(parksDrawn);
if(parksDrawn == false && percentOf == " National Parks"){
  d3.selectAll("span.state").text("threatened Montana WSA's");
}

//change percent
for(var att of attributes) {

    if(parksDrawn){
        d3.select(`span.${att}`).html(wsa[att+"Avg"]+ "%")
                  .style("color", function(){
              return colorizer(wsa, att);
            });
  } else {
        d3.select(`span.${att}`).html(wsa[att+"WsaAvg"]+ "%")
                  .style("color", function(){
              return colorizer(wsa, att);
            });
    }


}

//change selected button
d3.selectAll("#button")
      .classed("selected", false);

      d3.selectAll(`#button.${dotRef}`)
          .classed("selected", true);


};

/////////////////////////////////////////////////////////////////////////////////////
 
} ////end for loop creating dots for each attribute


////////////////////////////////////////////////////////////////////////////////////////
addParks = function() {

parksDrawn = true;
//recreate scales
  xAttScales = attributes.map(function(att){
      return xScaleGen(att);
});

for(i=0;i<attributes.length;i++) {

    var att = attributes[i];

////draw parks
dotSvg.selectAll(".parks")
      .data(parksData)
      .enter()
      .append("rect")
          .attr("class", function(d){
                return comp(d["Area"])+" park " + att;
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
      return colorizer(wsaData[20], att);
    });

///transition circle elements
  d3.select(`g.${att}`)
    .selectAll("circle")
    .transition()
    .duration(600)
    .attr("cx", function(d){
      return xAttScales[i](d[att]);
    });

  }
///////////////////////////////////////////
//highlight famous parks
var famous = ["Canyon lands National Park",
"Rocky Mountain National Park", "Saguaro National Park"];

//add move to front utility function
d3.selection.prototype.moveToFront = function() {  
      return this.each(function(){
        this.parentNode.appendChild(this);
      });
    }

for(var park of famous){
//darken
  dotSvg.selectAll(`.${comp(park)}`)
        .attr("stroke", "#000")
        .classed("front", true);

//move to front
  dotSvg.selectAll(`.${comp(park)}`)
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
      var x = d3.select(`.${comp(park)}.${att}`).attr("x") - 10;
        return x+"px";
      } )
      .style("top", function(){
      var y = parseFloat(d3.select(`.${comp(park)}.${att}`).attr("y")) - 5;
        return y+"px";
      });
    }

};



}; ///////////////////end add parks function
addParks();

//////////////////remove parks function////////////////////////////////
  removeParks = function(){

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


}); ///end d3 callback function


////////////////////add everything not svg to dotplot here//////////////////////////////////////////////////////

//////////////add parks toggle button////////
        d3.selectAll(".title2 p")
          .on("click", function(){

//only change if button is not active
if(d3.select(this).classed("selected") == false){

//change selected tab
      d3.selectAll(".title2 p")
      .classed("selected", false);

      d3.select(this)
          .classed("selected", true);

              if(parksDrawn==true){
                removeParks();
                if(selectedWsa != undefined){
                d3.selectAll("span.state").text("threatened Montana WSA's");
                }
              }
              else{
                addParks();
                d3.selectAll("span.state").text("National Parks");
              }

              //change percentage text
              if(selectedWsa != undefined){
                dotClickFocus(selectedWsa, selectedDotRef);
              }
              

            }
          });
//////////////////add key//////////////////////////////////////

var keyAdjust = 0;
if(vizW()< 450){
  keyAdjust+=30;
}

var key = dotSvg.append("g")
        .attr("class", "key")
        .attr("transform", `translate(10,${yScale(0)-50-keyAdjust})`);

  //add border to key
/*
    key.append("rect")
        .attr("x", -10)
          .attr("y", -13)
          .attr("width", 155)
          .attr("height", 40)
          .attr("stroke", "#000")
          .attr("stroke-width", .25)
          .attr("fill", "none");
          */

        key.append("circle")
        .attr("cx", 0)
        .attr("cy", 0)
        .attr("r", 5)
        .attr("fill", "#ddd");

        key.append("rect")
          .attr("x", -4)
          .attr("y", 10)
          .attr("width", 9)
          .attr("height", 9)
          .attr("fill", "#bbb")
          .attr("opacity", .5);

        key.append("text")
          .attr("x", 10)
          .attr("y", 3)
          .text("= Wilderness Study Area")
          .attr("font-size", "12px");

        key.append("text")
                  .attr("x", 10)
                  .attr("y", 18)
                  .text("= National Park")
                  .attr("font-size", "12px");

/////////////////upper section///////////////////////////
var upper = d3.select("#container")
              .append("div")
                .attr("class", "colHolder")
              .html(`<div id="title">
      <h2>On Average (Median) </h2>
      <div id="col">
        <p>
        Wilder than <br>
        <span class="Wildness" id="percent">87% </span><br>
        of <span class="state"> National Parks</span><br<
        </p>
      </div>
      <div id="col">
        <p>
        Darker than <br>
        <span class="Darkness" id="percent">44%</span><br>
        of <span class="state"> National Parks</span>
      </p>
      </div>
      <div id="col">
        <p>
        Quieter than <br>
        <span class="Quietness" id="percent">56%</span><br>
        of <span class="state"> National Parks</span>
      </p>
      </div>
        </div`);

/////////////////add map buttons////////////////////////////////
    
    var mapW = $("#mapContainer").width();
    buttonPadding = 20,
    buttonWidth = mapW/attributes.length- buttonPadding;

    for(att of attributes){
        var i = attributes.indexOf(att);

    d3.select("div#mapContainer")
        .append("div")
          .attr("class", function(){
            if(att == initial) return att + " selected";
           else return att;
          })
          .attr("id", "button")
          .html(`<h4>${att}</h4>`)
          .style("width", buttonWidth+"px")
          .style("left", function(){
                var left = i*buttonWidth + i*buttonPadding;
                return left+"px";
          })
          .style("top", "-40px")
          .on("click", labelClick);



        ///////add axis lines///////
    d3.select("#container")
              .append("div")
              .attr("id", "line")
                  .style("top", `${yScale(i)+5}px`);

    ////////////variable axis labels/////////
    d3.select("div#container")
        .append("div")
          .attr("id", "axis")
          .html(`<p>${att}</p>`)
          .style("left", `${vizW()/2 -40}px`)
          .style("top", `${yScale(i)-50}px`);  

    }
///////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////
//////////////////////////////initialize Leaflet map

var topLeft = [49, -115],
    botRight = [44.295, -105];

//make user bounds
var boundTopLeft = [53, -120],
    boundBotRight = [40, -100];

var bounds = L.latLngBounds(boundTopLeft, boundBotRight);

var myMap = L.map('mapid', {
        maxBounds: bounds,
        maxBoundsViscosity:0.1,
}).fitBounds([topLeft, botRight]);

L.tileLayer('https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png', {
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
  subdomains: 'abcd',
  maxZoom: 14,
  minZoom: 5
}).addTo(myMap);

var symbolLayer = L.featureGroup();

/////////////add WSA geojsons
$.getJSON('data/wsa.geojson', function(data){


/////////////////////////////////////////////////////////////////////////////
//Circles

symbolLayer.addTo(myMap);

//sort data so smaller symbols drawn on top
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

//////////////create div for each area/////////////////////////////////////////
  for(var wsa of wsaData) {
    var name = comp(wsa.properties["MANAME"]);

  //find centroid
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
var name = comp(wsa.properties["MANAME"]);


//append svg to divIcon, add circle symbols
    var symbol = d3.select(`div.${name}`)
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
///load geojson

////////////////////////////////////////////add geojson's/////////////////////////////////
  jsonLayer = L.geoJson(data, {

onEachFeature: function(feature, layer){

  var wsa = comp(feature.properties["MANAME"]);

 //set styles based on attribute
  layer.setStyle(style(feature));

  ///store bounds in map for access by d3 listener
  layerKey[wsa] = [layer, feature];

  layer.on("click", function(e){
      leafZoom(wsa);
      openPopup(e, layer, feature);
      dotClickFocus(wsa);
  });

  layer.on("mouseover",function (e){
    layer.setStyle(highStyle(feature));
  });

  layer.on("mouseout", function(e){
      layer.setStyle(style(feature));
  });
  
}
  });

///////////////////////////////////////////////////////////////////



/////////////////////////////////////////////////////////////////////////////////////////////////

///add and remove dots and json depending on zoom level. Fires at end of transition
myMap.on("zoomend", function(){

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



///////////////////////////////////////////////////////////////////////////////////////////////////////////////

///////end wrapper function
};

window.onload = wrapper();
