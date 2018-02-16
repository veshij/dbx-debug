const uploadSize = 4 * 1024 * 1024;
const uploadSpeedCheckUrl = "https://sea.dropbox-debug.com/upload_test"
const debugCheckUrl = "https://sea.dropbox-debug.com/debug-info"
const debugPopCheckUrl = "dropbox-debug.com/debug-info"
const downloadSize = 5 * 1024* 1024;
const downloadSpeedCheckUrl = "https://sea.dropbox-debug.com/download_test/perf_test_5m.data"
const popCheckUrlPrefix = ".pops.fastly-analytics.com/test_object.svg"
const headerCheckUrl = "https://sea.dropbox-debug.com/empty"

const pops = [
    'ams',
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
    'anycast',
    'default',
];

var all_data = {
    "plugins": {},
    "geolocation": {},
    "browser": {},
    "speed": {},
    "headers": {},
    "latency": {},
    "latency-v6": {},
    "dns" : {},
    "conn_stats": {},
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
        latencyString = '<table class="table table-sm"><thead><tr><th scope="col">POP</th><th scope="col">IPv4, ms</th><th scope="col">IPv6, ms</th></tr></thead><tbody>';
        popSorted = Object.keys(all_data["latency"])
        .sort(function(a,b){return (all_data["latency"][a]) - (all_data["latency"][b])})
        for (var i in popSorted) {
            v4lat =  all_data["latency"][popSorted[i]] || '-'
            v6lat =  all_data["latency-v6"][popSorted[i]] || '-' 
            latencyString += '<tr><th scope="row">' + popSorted[i].toUpperCase() + '</th>\
            <td>' + v4lat + '</td>\
            <td>' + v6lat + '</td>\
            </th></tr>';
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
        html = all_data["headers"]["x-dropbox-pop"].toUpperCase()
        if (!$.isEmptyObject(all_data["conn_stats"]["ip_version"]) && !$.isEmptyObject(all_data["conn_stats"]["server_protocol"])) {
            ip = all_data['conn_stats']['ip_version']
            http = all_data['conn_stats']['server_protocol']
            html += ('(IPv' + ip[3] + ', ' + http + ')')
        }
        $("#pop-body").html(html)
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
        if (resourceList[i].name.indexOf(popCheckUrlPrefix) != -1) {
            var popName = popNameRe.exec(resourceList[i].name)[1];
            all_data["latency"][popName] = Math.round(resourceList[i].responseStart - resourceList[i].requestStart);
            renderData();
        } else if (resourceList[i].name.indexOf(downloadSpeedCheckUrl) != -1) {
            downloadTime = (resourceList[i].responseEnd - resourceList[i].fetchStart)/1000; // seconds
            all_data["speed"]["download"] = Math.floor(downloadSize / downloadTime / 1024/1024 * 10 ) / 10;
            renderData();
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
    var dnsResponseTypes = {
        5: "CNAME",
        1: "A",
        28: "AAAA",
    }

    $.getJSON('https://dns.google.com/resolve?name=www.dropbox.com&type=A', function(data) {
        var html = '<p>'
        for ( var i in data["Answer"]) {
            html += data["Answer"][i]["name"] + "&#9;" + dnsResponseTypes[data["Answer"][i]["type"]] + "&#9;" + data["Answer"][i]["data"] + "<br/>"
        }
        html += "</p>"
        all_data["dns"]["A Query"] = html;
    });

    $.getJSON('https://dns.google.com/resolve?name=www.dropbox.com&type=AAAA', function(data) {
        var html = '<p>'
        for ( var i in data["Answer"]) {
            html += data["Answer"][i]["name"] + "&#9;" + dnsResponseTypes[data["Answer"][i]["type"]] + "&#9;" + data["Answer"][i]["data"] + "<br/>"
        }
        html += "</p>"
        all_data["dns"]["AAAA Query"] = html;
    });

    renderData();
}

function measureUploadSpeed() {
    $.post(uploadSpeedCheckUrl,
           '0'.repeat(uploadSize),
            function(data) {
                all_data["speed"]["upload"] = Math.floor(uploadSize/parseFloat(data)/ 1024/1024 * 10)/10;
            renderData();
    });
}

function measureDownloadSpeed() {
    $.get(downloadSpeedCheckUrl + uniqPostfix(),
            function(data) {
            calculate_performance();
        }
    );
}

function startRttMeasurements(){
    var i = 0;
    setInterval(function() {
    $.getJSON( debugCheckUrl, 
    function( data ) {
        // skip first checks (rtt could be not accurate)
        if (i<5) {i++} else {
            if ($.isNumeric(data["tcpinfo_rtt"])) {
                $("#rtt").html("<b>Live RTT: </b>" + Math.floor(data["tcpinfo_rtt"]/1000) + " ms");
                $('#speed-test').show()
            }
        }
    })}, 500);
}

function getConnectionStats(){
    $.getJSON( debugCheckUrl, function(data){
        for (var key in data) {
            if (!data.hasOwnProperty(key)) {continue;}
            all_data["conn_stats"][key] = data[key];
        }
        renderData();
    })
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

function updatePopLatency(pop) {
    $.getJSON(
        "https://" + pop + "." + debugPopCheckUrl,
        function( data ) {
            if ($.isNumeric(data["tcpinfo_rtt"])) {
                all_data["latency"][pop] = Math.floor(data["tcpinfo_rtt"]/1000)
            }
        })
}

function updateV6PopLatency(pop) {
    $.getJSON(
        "https://" + pop + "-v6." + debugPopCheckUrl,
        function( data ) {
            if ($.isNumeric(data["tcpinfo_rtt"])) {
                all_data["latency-v6"][pop] = Math.floor(data["tcpinfo_rtt"]/1000)
            }
        })
}


function initData() {
    collectBroserInfo()
    getConnectionStats();
    fetchAllHeaders(headerCheckUrl + uniqPostfix());   
    getGeolocation();
    startRttMeasurements();
    getDNSResults();
    loadFromPops();
    measureDownloadSpeed();
    measureUploadSpeed();

    pops.forEach(
        function(pop) {
            setInterval(function(){ updatePopLatency(pop); }, 1000);
            setInterval(function(){ updateV6PopLatency(pop); }, 1000);

        }
    );
}

initData();
setInterval(function () { renderData() }, 5000)
