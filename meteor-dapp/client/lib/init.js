ZERO = new BigNumber(0);

TWO_POW_256 = new BigNumber(2).pow(256);

SATOSHI_PER_BTC = new BigNumber(10).pow(8);



$(function () {
  $('#ticketSection a').click(function (e) {
    e.preventDefault()
    $(this).tab('show')
  });

  $('#appTab a:first').tab('show');

  $('[data-toggle="tooltip"]').tooltip();
})
