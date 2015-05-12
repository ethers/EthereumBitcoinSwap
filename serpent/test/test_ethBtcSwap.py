from ethereum import tester

from bitcoin import *


import pytest
slow = pytest.mark.slow

class TestEthBtcSwap(object):

    CONTRACT = 'ethBtcSwap.py'
    CONTRACT_GAS = 55000

    ETHER = 10 ** 18

    # tx is fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4
    # from block100K
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



    def testHappy(self):
        btcAddr = 0xc398efa9c392ba6013c5e04ee729755ef7f58b32
        numWei = self.ETHER
        weiPerSatoshi = 5 * 10**8
        depositRequired = numWei / 20

        BTC_RELAY = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(BTC_RELAY.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 0

        print('@@@ txhash: ', self.TX_HASH)
        assert 1 == self.c.reserveTicket(ticketId, self.TX_HASH, value=depositRequired)



        o = []
        self.s.block.log_listeners.append(lambda x: o.append(self.c._translator.listen(x)))


        txIndex = 1
        sibling = [0x8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87, 0x8e30899078ca1813be036a073bbf80b86cdddde1c96e9e9c99e9e3782df4ae49]
        txBlockHash = 0x000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506
        assert 1 == self.c.claimTicket(ticketId, self.TX_STR, self.TX_HASH, txIndex, sibling, txBlockHash)

        print(o)



    def testCreateTicket(self):
        btcAddr = 9
        numWei = self.ETHER
        weiPerSatoshi = 8
        assert -1 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi)

        assert 0 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert numWei == self.s.block.get_balance(self.c.address)

        assert 1 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert 2*numWei == self.s.block.get_balance(self.c.address)

        txHash = 7
        depositRequired = numWei / 20

        # no deposit
        assert 0 == self.c.reserveTicket(0, txHash)
        assert 0 == self.c.reserveTicket(1, txHash)

        # deposit < required
        assert 0 == self.c.reserveTicket(1, txHash, value=depositRequired - 1)

        # deposit == required
        assert 1 == self.c.reserveTicket(1, txHash, value=depositRequired)

        # deposit > required, need to use unclaimed ticketId0
        assert 1 == self.c.reserveTicket(0, txHash, value=depositRequired + 1)

        # deposit > required, but ticketId1 still reserved
        assert 0 == self.c.reserveTicket(1, txHash, value=depositRequired + 1)

        # deposit == required and previous ticketId1 reservation has expired
        self.s.block.timestamp += 3600 * 5
        assert 1 == self.c.reserveTicket(1, txHash, value=depositRequired)

        # close but not yet expired
        self.s.block.timestamp += 3600 * 4
        assert 0 == self.c.reserveTicket(1, txHash, value=depositRequired)

        # expired reservation can now be reserved
        self.s.block.timestamp += 100
        assert 1 == self.c.reserveTicket(1, txHash, value=depositRequired)


    # testClaimTicketZero
