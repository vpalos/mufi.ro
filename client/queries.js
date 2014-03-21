var RtvaiCollection = new Meteor.Collection("rtvai");
      
Meteor.subscribe('rtvai');

Template.queries.items = function () {
  return RtvaiCollection.find();
};

Template.queries.rendered = function() {
  // $('#rtvaiListingTable').footable()
};