/**
 * Ensure that the RTVAI data stays updated. In case there is no data, it downloads the appropriate files 
 * and populates the entire collection. The update is idempotent and is invoked periodically (i.e. 10 min).
 */

var RtvaiCollection = new Meteor.Collection("rtvai");

function scheduleUpdate(now) {
  Meteor.setTimeout(updateData, now ? 1 : (10 * 60 * 1000));
}

function loadData(prefix, date) {
  var when = date.tz("Europe/Bucharest");
  var file = prefix + when.format("YYYYMMDD");
  var temp = Npm.require("os").tmpdir();

  console.log("Downloading RTVAI file '%s'...", file);

  var download = new Future();
  var uri = _.sprintf("http://static.anaf.ro/static/10/Anaf/TVA_incasare/%s.zip", file);
  var command = _.sprintf('wget -q "%s" -O "%s/in.zip" && unzip -o "%s/in.zip" -d "%s"', uri, temp, temp, temp);
  
  Npm.require('child_process').exec(command, function(error) {
    if (error) {
      console.error("Error loading RTVAI file '%s': %s!", file, error);
    }
    download["return"](!error);
  });
  
  if (!download.wait()) {
    return false;
  }

  var agenti = fs.readFileSync(temp + "/agenti.txt").toString().split("\n");
  var istoric = fs.readFileSync(temp + "/istoric.txt").toString().split("\n");
  var names = {};

  for (i in agenti) {
    var line = agenti[i];
    var parts = line.split("#");
    names[parts[0]] = parts[1];
  }
  
  for (i in istoric) {
    var line = istoric[i];
    var parts = line.split("#");
    
    try {
      RtvaiCollection.upsert({
        "_id": parts[0]
      }, {
        $set: {
          "name": names[parts[1]],
          "code": parts[1],
          "date_start": parts[2],
          "date_end": parts[3],
          "date_published": parts[4],
          "date_processed": parts[5],
          "type": parts[6],
        }
      });
    } catch(e) {
      console.log("Error occured: ", e.message || String(e));
    }

    if (i > 0 && i % 1000 == 0) {
      console.log("...imported %d/%d entries...", i, istoric.length);
    }
  }
  console.log("...imported %d entries!", istoric.length);

  RtvaiCollection.upsert({
    "lastUpdate": { $exists: true }
  }, {
    "lastUpdate": date.toISOString()
  });

  return true;
}

function updateData() {
	var currentTime = moment().startOf("day");

  var lastUpdate = RtvaiCollection.findOne({
    "lastUpdate": { $exists: true }
  });

  if (!lastUpdate) {
    loadData("ultim_", currentTime);
  } else {
    var lastUpdateTime = moment(lastUpdate.lastUpdate).startOf("day");
    while (lastUpdateTime.isBefore(currentTime)) {
      loadData("", lastUpdateTime.add("day", 1));
    }
  }

  scheduleUpdate();
}

Meteor.startup(function() {
  Future = Npm.require('fibers/future');
  scheduleUpdate(true);
});

/**
 * Publish data to the client.
 */
Meteor.publish('rtvai', function() {
  return RtvaiCollection.find({}, { limit: 10 });
});