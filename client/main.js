Template.mainLayout.isActive = function(page) {
  return Router.current().template === page;
}