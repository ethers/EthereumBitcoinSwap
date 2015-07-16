$(function () {
  $('#ticketSection a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });

  $('#appTab a:first').tab('show');

  $('[data-toggle="tooltip"]').tooltip();
})
