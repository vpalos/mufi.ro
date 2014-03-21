Router.configure({
  'layoutTemplate': 'mainLayout'
});

Router.map(function() {

  this.route('introduction', {
    'path': '/'
  });

  this.route('queries', {
    'path': '/queries'
  });

});