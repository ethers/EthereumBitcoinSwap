from pyethereum import tester

from bitcoin import *


import pytest
slow = pytest.mark.slow

class TestEthBtcSwap(object):

    CONTRACT = 'ethBtcSwap.py'
    CONTRACT_GAS = 55000

    ETHER = 10 ** 18

    # tx is fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4
    TX_STR = '0100000001032e38e9c0a84c6046d687d10556dcacc41d275ec55fc00779ac88fdf357a187000000008c493046022100c352d3dd993a981beba4a63ad15c209275ca9470abfcd57da93b58e4eb5dce82022100840792bc1f456062819f15d33ee7055cf7b5ee1af1ebcc6028d9cdb1c3af7748014104f46db5e9d61a9dc27b8d64ad23e7383a4e6ca164593c2527c038c0857eb67ee8e825dca65046b82c9331586c82e0fd1f633f25f87c161bc6f8a630121df2b3d3ffffffff0200e32321000000001976a914c398efa9c392ba6013c5e04ee729755ef7f58b3288ac000fe208010000001976a914948c765a6914d43f2a7ac177da2c2f6b52de3d7c88ac00000000'
    TX_HASH = int(dbl_sha256(TX_STR.decode('hex')), 16)


    def setup_class(cls):
        tester.gas_limit = int(2e6)
        cls.s = tester.state()
        cls.c = cls.s.abi_contract(cls.CONTRACT)
        cls.snapshot = cls.s.snapshot()
        cls.seed = tester.seed

    def setup_method(self, method):
        self.s.revert(self.snapshot)
        tester.seed = self.seed


    # def listener(msg):
    #     if msg['event'] == 'LOG':
    #         # ...
    #         slogging.log_listeners.listeners.append(listener)


    def testCreateTicket(self):
        btcAddr = self.ETHER
        numWei = 0
        weiPerSatoshi = 0
        assert 0 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi)

        assert 1 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert btcAddr == self.s.block.get_balance(self.c.address)


    def testHappy(self):
        btcAddr = 0
        numWei = 0
        weiPerSatoshi = 0
        self.c.createTicket(btcAddr, numWei, weiPerSatoshi)

        # self.c.reserveTicket()
