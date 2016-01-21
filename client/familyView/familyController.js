angular.module('gaussHyrax.family', ['FamilyServices'])

.controller('familyController', ['$scope', 'FamilyFactory', 
  function($scope, FamilyFactory){

  console.log('controller loaded');
  var userID;
  var familyData;

  $scope.familyData = FamilyFactory.getUserID()
    .then(function(userID){
      console.log(userID.data);
      FamilyFactory.getAllFamilyMembers(userID.data)
      .then(function(familyMember) {
        $scope.familyData = familyMember.data;
      });
    });


    // Modal controller
    $scope.modalShown = false;
    $scope.toggleModal = function() {
      $scope.modalShown = !$scope.modalShown;
    };

    // $scope.expandActionsView = false;
    $scope.checkActions = function(familyMemberObj) {
      console.log(familyMemberObj);
      $scope.expandActionsView = familyMemberObj;

      // if DIV is visible it will be hidden and vice versa
      console.log("clicked on drop down menu");
      // $scope.expandActionsView = $scope.expandActionsView ? false : true;
    }

}])
.directive('modalDialog', function() {
  return {
   restrict: 'E',
   scope: {
     show: '='
   },
   replace: true, // Replace with the template below
   transclude: true, // we want to insert custom content inside the directive
   link: function(scope, element, attrs) {
     scope.dialogStyle = {};
     if (attrs.width)
       scope.dialogStyle.width = attrs.width;
     if (attrs.height)
       scope.dialogStyle.height = attrs.height;
     scope.hideModal = function() {
       scope.show = false;
     };
   },
   template: "<div class='ng-modal' ng-show='show'> <div class='ng-modal-overlay' ng-click='hideModal()'></div> <div class='ng-modal-dialog' ng-style='dialogStyle'><div class='ng-modal-close' ng-click='hideModal()'>X</div><div class='ng-modal-dialog-content' ng-transclude></div></div></div>" // See below
 };
})
