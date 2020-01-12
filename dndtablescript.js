currSize = 73.11;

window.addEventListener('load', function() {
  document.querySelector('input[type="file"]').addEventListener('change', function() {
      if (this.files && this.files[0]) {
          var img = document.querySelector('img');  // $('img')[0]
          img.src = URL.createObjectURL(this.files[0]); // set src to blob url
      }
  });
});

function createGrid(size) {
    var gridStatus = document.getElementById("gridDisplay");

    if(gridStatus) {
      gridStatus.remove();
    }

    currSize = size;

    var ratioW = Math.floor($(window).width()/size),
        ratioH = Math.floor($(window).height()/size);
    
    var parent = $('<div />', {
        id: 'gridDisplay',
        class: 'grid', 
        width: ratioW  * size, 
        height: ratioH  * size
    }).addClass('grid').appendTo('body');

    for (var i = 0; i < ratioH; i++) {
        for(var p = 0; p < ratioW; p++){
            $('<div />', {
                width: size - 1, 
                height: size - 1
            }).appendTo(parent);
        }
    }
}

function addInit() {
  $("#initTable tbody").append(
      "<tr>" +
        "<td>Initiative:</td>" +
        "<td><div contenteditable>Name (Editable)</div></td>" +
      "</tr>"
  );
}

function remInit() {
  $("tr").remove(":contains('Dead')");
}