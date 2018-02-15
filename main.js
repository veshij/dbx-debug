const uploadSize = 4 * 1024 * 1024;
const uploadSpeedCheckUrl  ="http://oleg-dbx/upload_blackhole"
const debugCheckUrl = "http://oleg-dbx/debug-info"
const downloadSize = 5898240;
const downloadSpeedCheckUrl = "https://www.dropbox.com/static/images/testphoto3.jpg"

const popCheckUrlPrefix = ".pops.fastly-analytics.com/test_object.svg"
const headerCheckUrl = "https://www.dropboxstatic.com/static/images/sprites/web_2x_sprites-vflN8VDFL.png"

const pops = [
    'ams',
    // 'anycast',
    'cdg',
    'dfw',
    'fra',
    'hkg',
    'iad',
    'jfk',
    'lax',
    'lhr',
    'mad',
    'mia',
    'nrt',
    'ord',
    'sea',
    'sin',
    'sjc',
    'syd',
];

var all_data = {
    "plugins": {},
    "geolocation": {},
    "browser": {},
    "speed": {},
    "headers": {},
    "latency": {},
    "dns" : {},
};

function renderData() {
    pluginString = "";
    for (var key in all_data["plugins"]) {
        if (!all_data["plugins"].hasOwnProperty(key)) {continue;}
        pluginString += "<b>" + key + ":</b> " + all_data["plugins"][key] + "<br>";
    }
    $("#plugins-body").html(pluginString);


    browserString = "<b>Version: </b>" + all_data["browser"]["version"] + "<br>"
                  + "<b>Online: </b>" + all_data["browser"]["online"] + "<br>"
                  + "<b>Language: </b>" + all_data["browser"]["language"] + "<br>"
                  + "<b>Platform: </b>" + all_data["browser"]["platform"] + "<br>"
                  + "<b>Product: </b>" + all_data["browser"]["product"] + "<br>"
                  + "<b>User Agent: </b>" + all_data["browser"]["userAgent"] + "<br>";
    $("#browser_info-body").html(browserString);


    geolocationString = "";
    for (var key in all_data["geolocation"]) {
        if (!all_data["geolocation"].hasOwnProperty(key)) {continue;}
        geolocationString += "<b>" + key + ":</b> " + all_data["geolocation"][key] + "<br>";
    }
    $("#geolocation-body").html(geolocationString);

    ipString = "";
    for (var key in all_data["ip"]) {
        if (!all_data["ip"].hasOwnProperty(key)) {continue;}
        ipString += "<b>" + key + ":</b> " + all_data["ip"][key] + "<br>";
    }
    $("#ip_version-body").html(ipString);

    headerString = "";
    headerKeys = [];
    for (k in all_data["headers"]) {
        if (!all_data["headers"].hasOwnProperty(k)) {continue;}
        headerKeys.push(k);
    }

    headerKeys.sort();

    for (i in headerKeys) {
        key = headerKeys[i];
        headerString += "<b>" + key + ":</b> " + all_data["headers"][key] + "<br>";
    }
    $("#headers-body").html(headerString);

    if (!$.isEmptyObject(all_data["latency"])) {
        latencyString = '<table class="table table-sm"><thead><tr><th scope="col">POP</th><th scope="col">ms</th></tr></thead><tbody>';
        popSorted = Object.keys(all_data["latency"])
        .sort(function(a,b){return (all_data["latency"][a] || -1) - (all_data["latency"][b] || -1)})
        for (var i in popSorted) {
            latencyString += '<tr><th scope="row">' + popSorted[i].toUpperCase() + '</th><td>' + all_data["latency"][popSorted[i]] + '</td></th></tr>';
        }
        latencyString += '</tbody></table>';
        $("#performance-body").html(latencyString);
        $('#latency').show()

    }
    if (!$.isEmptyObject(all_data["speed"])) {
        html = '<table class="table table-sm"><thead><tr><th scope="col"></th><th scope="col">MB/s</th><th scope="col">Mbit/s</th></tr></thead><tbody>';
        if ($.isNumeric(all_data["speed"]["upload"])) {
            html += '<tr><th scope="row">Upload</th><td>' + all_data["speed"]["upload"] + '</td><td>' + all_data["speed"]["upload"]*8 + '</td></th></tr>';
        }
        if ($.isNumeric(all_data["speed"]["download"])) {
            html += '<tr><th scope="row">Download</th><td>' + all_data["speed"]["download"] + '</td><td>' + all_data["speed"]["download"]*8 + '</td></th></tr>';
        }
        html += '</tbody></table>';
        $("#speed-body").html(html)
        $('#speed-test').show()
    }

    if (!$.isEmptyObject(all_data["headers"]["x-dropbox-pop"])) {
        $("#pop-body").html(all_data["headers"]["x-dropbox-pop"].toUpperCase())
        $('#pop').show()
    }

    $("#b64-well").html((btoa(JSON.stringify(all_data))));

    $("#dns-a-test").html(all_data["dns"]["A Query"]);

    $("#dns-aaaa-test").html(all_data["dns"]["AAAA Query"]);
}

function calculate_performance() {
    var popNameRe = new RegExp('.*pop=(.*)');
    var resourceList = window.performance.getEntriesByType("resource");
    for (i = 0; i < resourceList.length; i++) {
        if (resourceList[i].initiatorType == "img") {
            if (resourceList[i].name.indexOf(popCheckUrlPrefix) != -1) {
                var popName = popNameRe.exec(resourceList[i].name)[1];
                all_data["latency"][popName] = Math.round(resourceList[i].responseStart - resourceList[i].requestStart);
                renderData();
            } else if (resourceList[i].name.indexOf(downloadSpeedCheckUrl) != -1) {
                console.log(resourceList[i])
                downloadTime = (resourceList[i].responseEnd - resourceList[i].fetchStart)/1000; // seconds
                console.log(downloadTime)
                console.log(downloadSize / downloadTime /1024/1024)
                all_data["speed"]["download"] = Math.floor(downloadSize / downloadTime / 1024/1024 * 10 ) / 10;
                renderData();
            }
        }
    }
    renderData();
}

function uniqPostfix() {
    return '?unique=' + Math.floor((1 + Math.random()) * 0x10000).toString(16)
}

function loadFromPops() {
    var images = [];
    for (i = 0; i < pops.length; i++) {
        images.push('https://'+ pops[i] + popCheckUrlPrefix + uniqPostfix() + '&pop=' + pops[i]);
    }

    // measure download speed 
    images.push(downloadSpeedCheckUrl + uniqPostfix())

    for ( i = 0; i<images.length; i++) {
        var image = new Image();
        image.onload = function() {calculate_performance()}
        image.onerror = function() {calculate_performance()}
        image.src = images[i];
    }
    // sequential image load
    // var i = 0;
    // function loadImageArrayAsync(){
    //     var image = new Image();
    //     image.onload = function(){ 
    //         if (i++ < images.length - 1) loadImageArrayAsync();
    //         else calculate_performance();
    //     };
    //     image.onerror = function(){
    //         if (i++ < images.length - 1) loadImageArrayAsync();
    //         else calculate_performance();
    //     }
    //     image.src = images[i];
    //     calculate_performance();
    // }
    // loadImageArrayAsync();
}

function getGeolocation() {
    $.getJSON('https://freegeoip.net/json/?callback=?', function(data) {
        for (var key in data) {
            if (!data.hasOwnProperty(key)) {continue;}
            all_data["geolocation"][key] = data[key];
        }
        renderData();
    });
}

function parseHeaders(headerString) {
    return headerString.split("\n")
     .map(x=>x.split(/: */,2))
     .filter(x=>x[0])
     .reduce((ac, x)=>{ac[x[0]] = x[1];return ac;}, {});
}

function fetchAllHeaders(url) {
    var headers = {};
    var allHeaderString = "";
    var jqXHR = $.ajax({
        url: url,
        type:'get',
        success:function() {
            allHeaderString = jqXHR.getAllResponseHeaders();
            headers = parseHeaders(allHeaderString);
            all_data["headers"] = headers;
        },
        error : function() {
            allHeaderString = "An error has occurred";
            headers["Error"] = allHeaderString;
         }
    });

    renderData();
}

function getDNSResults() {
    $.getJSON('https://dns.google.com/resolve?name=www.dropbox.com&type=A', function(data) {
        var str = JSON.stringify(data, null, 2); // spacing level = 2
        all_data["dns"]["A Query"] = str;
    });

    $.getJSON('https://dns.google.com/resolve?name=www.dropbox.com&type=AAAA', function(data) {
        var str = JSON.stringify(data, null, 2); // spacing level = 2
        all_data["dns"]["AAAA Query"] = str;
    });

    renderData();
}

function measureDownloadSpeed() {
    $.post(uploadSpeedCheckUrl,
           '0'.repeat(uploadSize),
            function(data) {
                all_data["speed"]["upload"] = Math.floor(uploadSize/parseFloat(data)/ 1024/1024 * 10)/10;
            renderData();
    });
}

function startRttMeasurements(){
    var i = 0;
    setInterval(function() {
    $.getJSON( debugCheckUrl, 
    function( data ) {
        // skip first 10 rtt checks (rtt could be not accurate)
        if (i<3) {i++} else {
            if ($.isNumeric(data["tcpinfo_rtt"])) {
                $("#rtt").html("<b>Live RTT: </b>" + Math.floor(data["tcpinfo_rtt"]/1000) + " ms");
                $('#speed-test').show()
            }
        }
    })}, 500);
}

function collectBroserInfo() {
    all_data["browser"]["browser"] = navigator.appName;
    all_data["browser"]["codename"] = navigator.appCodeName;
    all_data["browser"]["version"] = navigator.appVersion;
    all_data["browser"]["online"] = navigator.onLine;
    all_data["browser"]["language"] = navigator.language;
    all_data["browser"]["platform"] = navigator.platform;
    all_data["browser"]["product"] = navigator.product;
    all_data["browser"]["userAgent"] = navigator.userAgent;

    for (var key in navigator.plugins) {
        if (!navigator.plugins.hasOwnProperty(key)) {continue;}
        all_data["plugins"][navigator.plugins[key].name] = navigator.plugins[key].description;
    }  
}

function initData() {
    collectBroserInfo()
    getGeolocation();
    fetchAllHeaders(headerCheckUrl);    
    getDNSResults();
    loadFromPops();
    measureDownloadSpeed();
    startRttMeasurements()
}



initData();