from ethereum import tester

from bitcoin import *


import pytest
slow = pytest.mark.slow

class TestEthBtcSwap(object):

    CONTRACT = 'ethBtcSwap.py'

    ETHER = 10 ** 18

    def setup_class(cls):
        tester.gas_limit = int(2.4e6)  # 2.2e6 should be ok if testingOnly methods are commented out
        cls.s = tester.state()
        cls.c = cls.s.abi_contract(cls.CONTRACT)
        cls.snapshot = cls.s.snapshot()
        cls.seed = tester.seed

    def setup_method(self, method):
        self.s.revert(self.snapshot)
        tester.seed = self.seed


    def testClaimerFee(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = self.ETHER
        weiPerSatoshi = 38461538462  # ceiling of numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1

        claimerBalPreReserve = self.s.block.get_balance(addrClaimer)
        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=claimer, profiling=True)
        # print('GAS: '+str(res['gas']))
        assert res['output'] == 1

        approxCostOfReserve = res['gas']
        boundedCostOfReserve = int(1.05*approxCostOfReserve)
        balPreClaim = self.s.block.get_balance(addrClaimer)
        assert balPreClaim < claimerBalPreReserve - depositRequired - approxCostOfReserve
        assert balPreClaim > claimerBalPreReserve - depositRequired - boundedCostOfReserve


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        balPreClaim = self.s.block.get_balance(addrClaimer)
        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 2


        claimerFeePercent = (satoshiOutputTwo % 10000) / 10000.0
        feeToClaimer = int(claimerFeePercent * numWei)  # int() is needed


        # gas from profiling claimTicket() is inaccurate so assert that the
        # balance is within 2.4X of approxCostToClaim
        # TODO why 2.4X ?
        approxCostToClaim = claimRes['gas']
        boundedCostToClaim = int(2.4*approxCostToClaim)

        endClaimerBal = self.s.block.get_balance(addrClaimer)
        assert endClaimerBal < balPreClaim + depositRequired + feeToClaimer - approxCostToClaim
        assert endClaimerBal > balPreClaim + depositRequired + feeToClaimer - boundedCostToClaim

        assert endClaimerBal < claimerBalPreReserve + feeToClaimer - approxCostToClaim - approxCostOfReserve
        assert endClaimerBal > claimerBalPreReserve + feeToClaimer - boundedCostToClaim - boundedCostOfReserve

        indexOfBtcAddr = txStr.find(format(btcAddr, 'x'))
        ethAddrBin = txStr[indexOfBtcAddr+68:indexOfBtcAddr+108].decode('hex') # assumes ether addr is after btcAddr
        buyerEthBalance = self.s.block.get_balance(ethAddrBin)

        assert buyerEthBalance == (1 - claimerFeePercent) * numWei


        assert eventArr == [{'_event_type': 'claimSuccess', 'numSatoshi': satoshiOutputOne,
            'btcAddr': btcAddr,
            'ethAddr': ethAddr,
            'satoshiIn2ndOutput': satoshiOutputTwo
            }]
        eventArr.pop()


        # re-claim is not allowed
        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 0

        assert eventArr == [{'_event_type': 'claimFail',
            'failCode': 99990100  # a claim sets the claimer to 0, thus this failure
            }]
        eventArr.pop()


    # weiPerSatoshi is a round figure 200000000000
    def testClaimRoundPrice(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = int(5.2*self.ETHER)
        weiPerSatoshi = 200000000000  # numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1

        claimerBalPreReserve = self.s.block.get_balance(addrClaimer)
        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=claimer, profiling=True)
        # print('GAS: '+str(res['gas']))
        assert res['output'] == 1

        approxCostOfReserve = res['gas']
        boundedCostOfReserve = int(1.05*approxCostOfReserve)
        balPreClaim = self.s.block.get_balance(addrClaimer)
        assert balPreClaim < claimerBalPreReserve - depositRequired - approxCostOfReserve
        assert balPreClaim > claimerBalPreReserve - depositRequired - boundedCostOfReserve


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        balPreClaim = self.s.block.get_balance(addrClaimer)
        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 2


        claimerFeePercent = (satoshiOutputTwo % 10000) / 10000.0
        feeToClaimer = int(claimerFeePercent * numWei)  # int() is needed


        # gas from profiling claimTicket() is inaccurate so assert that the
        # balance is within 2.4X of approxCostToClaim
        # TODO why 2.4X ?
        approxCostToClaim = claimRes['gas']
        boundedCostToClaim = int(2.4*approxCostToClaim)

        endClaimerBal = self.s.block.get_balance(addrClaimer)
        assert endClaimerBal < balPreClaim + depositRequired + feeToClaimer - approxCostToClaim
        assert endClaimerBal > balPreClaim + depositRequired + feeToClaimer - boundedCostToClaim

        assert endClaimerBal < claimerBalPreReserve + feeToClaimer - approxCostToClaim - approxCostOfReserve
        assert endClaimerBal > claimerBalPreReserve + feeToClaimer - boundedCostToClaim - boundedCostOfReserve

        indexOfBtcAddr = txStr.find(format(btcAddr, 'x'))
        ethAddrBin = txStr[indexOfBtcAddr+68:indexOfBtcAddr+108].decode('hex') # assumes ether addr is after btcAddr
        buyerEthBalance = self.s.block.get_balance(ethAddrBin)

        assert buyerEthBalance == (1 - claimerFeePercent) * numWei


        assert eventArr == [{'_event_type': 'claimSuccess', 'numSatoshi': satoshiOutputOne,
            'btcAddr': btcAddr,
            'ethAddr': ethAddr,
            'satoshiIn2ndOutput': satoshiOutputTwo
            }]
        eventArr.pop()


    # smaller version of testClaimerFee except weiPerSatoshi is 1 less (thus
    # buyer's 0.26 BTC will not be enough to claim the ether)
    def testInsufficientSatoshi(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = self.ETHER
        weiPerSatoshi = 38461538461  # floor of numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1

        claimerBalPreReserve = self.s.block.get_balance(addrClaimer)
        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=claimer, profiling=True)
        # print('GAS: '+str(res['gas']))
        assert res['output'] == 1


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        balPreClaim = self.s.block.get_balance(addrClaimer)
        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 0

        assert eventArr == [{'_event_type': 'claimFail',
            'failCode': 99990400
            }]
        eventArr.pop()


    def testWrongClaimer(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = self.ETHER
        weiPerSatoshi = numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        reserver = tester.k1
        claimer = tester.k2

        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=reserver, profiling=True)
        assert res['output'] == 1


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        assert 0 == self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer)

        assert eventArr == [{'_event_type': 'claimFail',
            'failCode': 99990100
            }]
        eventArr.pop()


    def testClaimWithoutReserve(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = self.ETHER
        weiPerSatoshi = numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        assert 0 == self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer)

        assert eventArr == [{'_event_type': 'claimFail',
            'failCode': 99990100
            }]
        eventArr.pop()



    def testClaimBadTx(self):
        # block 300k
        txBlockHash = 0x000000000000000082ccf8f1557c5d40b21edabb18d2d691cfbf87118bac7254
        txStr = '0100000002a0419f78a1ef9441b1d91a5cb3e198d4a1ef8b382cd942de98a58a5f968d073f000000006a473044022032a0332c1afb753afc1bb44555c9ccefa83709ca5e1e62a608024b9cf4c087c002201a506f2c8442c390590769d5cdefc6e4e0e1f8517a060365ec527cc9b749068c012102caa12ebb756b4a3a90c8779d2ec75d7082f9c2897f0715989840f16bf3aa7adfffffffff55ad24bbc9541d9848ad64546ab4a6f4b96cb15043ddeea52fbeb3cc70987340000000008a47304402203d4cb993d6e73979c3aae2d1c4752f6b4c501c4b64fc19f212efaa54a7ba199f02204ba50d8764532c2157f7438cf2eee6e975853975eb3803823f9de4a1c1f230e30141040a424c356d3adfdc6ba29cf41474105434d01a7ad5be3ae6938f8af92da215bdb0e21bd2ad6301f43be02f1ce796229a8c00873356e11a056c8c65f731304a7fffffffff0280ba8c01000000001976a914956bfc5575c0a7134c7effef268e51d887ba701588ac4a480f00000000001976a914587488c119f40666b4a0c807b0d7a1acfe3b691788ac00000000'
        txHash = 0x141e4ea2fa3c9bf9984d03ff081d21555f8ccc7a528326cea96221ca6d476566
        txIndex = 190
        sibling = [0x09636b32593267f1aec7cf7ac36b6a51b8ef158f5648d1d27882492b7908ca2e, 0xe081237dd6f75f2a0b174ac8a8f138fffd4c05ad05c0c12cc1c69a203eec79ae, 0x0c23978510ed856b5e17cba4b4feba7e8596581d604cce84f50b6ea180fd91a4, 0x1f4deef9f140251f6dc011d3b9db88586a2a313de813f803626dcdac4e1e3127, 0x266f31fc4cdca488ecf0f9cbf56e4b25aa5e49154ae192bc6982fc28827cc62b, 0xd394350ece3e0cb705c99c1db14f29d1db0e1a3dcbd3094baf695e297bea0f6b, 0x3a2e3e81c6ef3a3ff65ec6e62ead8eb5c2f8bb950ba2422038fa573a6d638812, 0xaec0b4d49d190f9ac61d0e32443ade724274de466eed4acb0498207664832d84]
        satoshiOutputOne = int(0.26e8)
        satoshiOutputTwo = int(0.01001546e8)

        btcAddr = 0x956bfc5575c0a7134c7effef268e51d887ba7015
        numWei = self.ETHER
        weiPerSatoshi = 38461538462  # ceiling of numWei / satoshiOutputOne
        ethAddr = 0x587488c119f40666b4a0c807b0d7a1acfe3b6917

        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ZERO = self.s.abi_contract('./test/mockVerifyTxReturnsZero.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ZERO.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1

        claimerBalPreReserve = self.s.block.get_balance(addrClaimer)
        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=claimer, profiling=True)
        # print('GAS: '+str(res['gas']))
        assert res['output'] == 1

        approxCostOfReserve = res['gas']
        boundedCostOfReserve = int(1.05*approxCostOfReserve)
        balPreClaim = self.s.block.get_balance(addrClaimer)
        assert balPreClaim < claimerBalPreReserve - depositRequired - approxCostOfReserve
        assert balPreClaim > claimerBalPreReserve - depositRequired - boundedCostOfReserve

        contractBalance = self.s.block.get_balance(self.c.address)


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        balPreClaim = self.s.block.get_balance(addrClaimer)
        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 0

        # gas from profiling claimTicket() is inaccurate so assert that the
        # balance is within 2.2X of approxCostToClaim
        # TODO why so high at 2.2X?
        approxCostToClaim = claimRes['gas']
        boundedCostToClaim = int(2.2*approxCostToClaim)

        endClaimerBal = self.s.block.get_balance(addrClaimer)
        assert endClaimerBal < balPreClaim - approxCostToClaim
        assert endClaimerBal > balPreClaim - boundedCostToClaim

        assert endClaimerBal < claimerBalPreReserve - depositRequired - approxCostToClaim - approxCostOfReserve
        assert endClaimerBal > claimerBalPreReserve - depositRequired - boundedCostToClaim - boundedCostOfReserve

        indexOfBtcAddr = txStr.find(format(btcAddr, 'x'))
        ethAddrBin = txStr[indexOfBtcAddr+68:indexOfBtcAddr+108].decode('hex') # assumes ether addr is after btcAddr
        buyerEthBalance = self.s.block.get_balance(ethAddrBin)

        assert buyerEthBalance == 0
        assert self.s.block.get_balance(self.c.address) == contractBalance

        assert eventArr == [{'_event_type': 'claimFail',
            'failCode': 99999999
            }]
        eventArr.pop()



    def testZeroFee(self):
        # tx is fff2525b8931402dd09222c50775608f75787bd2b87e56995a7bdd30f79702c4
        # from block100K
        txBlockHash = 0x000000000003ba27aa200b1cecaad478d2b00432346c3f1f3986da1afd33e506
        txStr = '0100000001032e38e9c0a84c6046d687d10556dcacc41d275ec55fc00779ac88fdf357a187000000008c493046022100c352d3dd993a981beba4a63ad15c209275ca9470abfcd57da93b58e4eb5dce82022100840792bc1f456062819f15d33ee7055cf7b5ee1af1ebcc6028d9cdb1c3af7748014104f46db5e9d61a9dc27b8d64ad23e7383a4e6ca164593c2527c038c0857eb67ee8e825dca65046b82c9331586c82e0fd1f633f25f87c161bc6f8a630121df2b3d3ffffffff0200e32321000000001976a914c398efa9c392ba6013c5e04ee729755ef7f58b3288ac000fe208010000001976a914948c765a6914d43f2a7ac177da2c2f6b52de3d7c88ac00000000'
        txHash = int(dbl_sha256(txStr.decode('hex')), 16)
        txIndex = 1
        sibling = [0x8c14f0db3df150123e6f3dbbf30f8b955a8249b62ac1d1ff16284aefa3d06d87, 0x8e30899078ca1813be036a073bbf80b86cdddde1c96e9e9c99e9e3782df4ae49]
        satoshiOutputOne = int(5.56e8)
        satoshiOutputTwo = int(44.44e8)

        btcAddr = 0xc398efa9c392ba6013c5e04ee729755ef7f58b32
        numWei = self.ETHER
        weiPerSatoshi = 38461538462  # ceiling of numWei / satoshiOutputOne
        depositRequired = numWei / 20

        MOCK_VERIFY_TX_ONE = self.s.abi_contract('./test/mockVerifyTxReturnsOne.py')
        self.c.setTrustedBtcRelay(MOCK_VERIFY_TX_ONE.address)

        ticketId = self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert ticketId == 1

        claimer = tester.k1
        addrClaimer = tester.a1

        claimerBalPreReserve = self.s.block.get_balance(addrClaimer)
        gasPrice = int(10e12)  # 10 szabo
        res = self.c.reserveTicket(ticketId, txHash, value=depositRequired, sender=claimer, profiling=True)
        # print('GAS: '+str(res['gas']))
        assert res['output'] == 1

        # since the gas from profiling seems approximate, assert that the
        # balance is within 5% of approxTxCost
        approxCostOfReserve = res['gas']
        boundedCostOfReserve = int(1.05*approxCostOfReserve)
        balPreClaim = self.s.block.get_balance(addrClaimer)
        assert balPreClaim < claimerBalPreReserve - depositRequired - approxCostOfReserve
        assert balPreClaim > claimerBalPreReserve - depositRequired - boundedCostOfReserve


        eventArr = []
        self.s.block.log_listeners.append(lambda x: eventArr.append(self.c._translator.listen(x)))


        claimRes = self.c.claimTicket(ticketId, txStr, txHash, txIndex, sibling, txBlockHash, sender=claimer, profiling=True)
        # print('GAS claimTicket() ', claimRes['gas'])
        assert claimRes['output'] == 2

        # gas from profiling claimTicket() is inaccurate so assert that the
        # balance is within 1.8X of approxCostToClaim
        # TODO 2X?
        approxCostToClaim = claimRes['gas']
        boundedCostToClaim = int(2*approxCostToClaim)

        endClaimerBal = self.s.block.get_balance(addrClaimer)
        assert endClaimerBal < balPreClaim + depositRequired - approxCostToClaim
        assert endClaimerBal > balPreClaim + depositRequired - boundedCostToClaim

        assert endClaimerBal < claimerBalPreReserve - approxCostToClaim - approxCostOfReserve
        assert endClaimerBal > claimerBalPreReserve - boundedCostToClaim - boundedCostOfReserve

        indexOfBtcAddr = txStr.find(format(btcAddr, 'x'))
        ethAddrBin = txStr[indexOfBtcAddr+68:indexOfBtcAddr+108].decode('hex') # assumes ether addr is after btcAddr
        buyerEthBalance = self.s.block.get_balance(ethAddrBin)

        assert buyerEthBalance == numWei


        assert eventArr == [{'_event_type': 'claimSuccess', 'numSatoshi': satoshiOutputOne,
            'btcAddr': btcAddr,
            'ethAddr': 0x948c765a6914d43f2a7ac177da2c2f6b52de3d7c,
            'satoshiIn2ndOutput': satoshiOutputTwo
            }]
        eventArr.pop()


    def testClaimInvalidTicket(self):
        txStr = '1'
        txHash = 0xbeef
        txIndex = 1
        sibling = []
        txBlockHash = 0xbeef2
        assert self.c.claimTicket(-1, txStr, txHash, txIndex, sibling, txBlockHash) == 0
        assert self.c.claimTicket(0, txStr, txHash, txIndex, sibling, txBlockHash) == 0
        assert self.c.claimTicket(1, txStr, txHash, txIndex, sibling, txBlockHash) == 0
        assert self.c.claimTicket(1000, txStr, txHash, txIndex, sibling, txBlockHash) == 0

        assert self.c.claimTicket(0, txStr, 0, txIndex, sibling, txBlockHash) == 0
        assert self.c.claimTicket(0, txStr, 1, txIndex, sibling, txBlockHash) == 0
        assert self.c.claimTicket(1, txStr, 1, txIndex, sibling, txBlockHash) == 0


    def testReserveInvalidTicket(self):
        assert self.c.reserveTicket(-1, 0xbeef) == 0
        assert self.c.reserveTicket(0, 0xbeef) == 0
        assert self.c.reserveTicket(1, 0xbeef) == 0
        assert self.c.reserveTicket(1000, 0xbeef) == 0


    # test Create Lookup Reserve ticket
    #
    # the sender is always the coinbase so that the gas for reserveTicket does not
    # affect calculations of the balance after reserveTicket: using the coinbase
    # seems to be a special case with tester
    def testCLRTicket(self):
        btcAddr = 9
        numWei = self.ETHER
        weiPerSatoshi = 8

        expExpiry = self.s.block.timestamp + 3600*4
        expSender = int(self.s.block.coinbase.encode('hex'), 16)

        # ticket missing value
        preBal = self.coinbaseBalance()
        assert 0 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi)
        postBal = self.coinbaseBalance()
        assert postBal == preBal

        assert 1 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert numWei == self.s.block.get_balance(self.c.address)

        assert 2 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei)
        assert 2*numWei == self.s.block.get_balance(self.c.address)

        assert self.c.lookupTicket(0) == []
        assert self.c.lookupTicket(1) == [btcAddr, numWei, weiPerSatoshi, 1, 0, 0]
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, 1, 0, 0]
        assert self.c.lookupTicket(3) == []
        assert self.c.lookupTicket(100) == []
        assert self.c.lookupTicket(-1) == []

        # ticket insufficient value sent, value should be refunded
        preBal = self.coinbaseBalance()
        contractBalance = self.s.block.get_balance(self.c.address)
        assert 0 == self.c.createTicket(btcAddr, numWei, weiPerSatoshi, value=numWei - 1)
        assert self.s.block.get_balance(self.c.address) == contractBalance
        postBal = self.coinbaseBalance()
        assert postBal == preBal


        txHash = 0xbeef
        depositRequired = numWei / 20

        # no deposit
        preBal = self.coinbaseBalance()
        assert 0 == self.c.reserveTicket(1, txHash)
        assert 0 == self.c.reserveTicket(2, txHash)
        postBal = self.coinbaseBalance()
        assert postBal == preBal

        # deposit < required
        preBal = self.coinbaseBalance()
        assert 0 == self.c.reserveTicket(2, txHash, value=depositRequired - 1)
        postBal = self.coinbaseBalance()
        assert postBal == preBal

        # deposit == required
        preBal = self.s.block.get_balance(self.s.block.coinbase)
        assert 1 == self.c.reserveTicket(2, txHash, value=depositRequired, sender=tester.k0)
        postBal = self.coinbaseBalance()
        assert postBal == preBal - depositRequired
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]

        # deposit > required ok since using unclaimed ticketId0
        preBal = self.coinbaseBalance()
        assert 1 == self.c.reserveTicket(1, txHash, value=depositRequired + 1)
        postBal = self.coinbaseBalance()
        assert postBal == preBal - depositRequired - 1
        assert self.c.lookupTicket(1) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]

        # deposit > required, but ticketId2 still reserved
        preBal = self.coinbaseBalance()
        assert 0 == self.c.reserveTicket(2, txHash, value=depositRequired + 1)
        postBal = self.coinbaseBalance()
        assert postBal == preBal
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]

        # deposit == required and previous ticketId2 reservation has expired
        preBal = self.coinbaseBalance()
        self.s.block.timestamp += 3600 * 5
        timePreReserve = self.s.block.timestamp
        assert 1 == self.c.reserveTicket(2, txHash, value=depositRequired)
        postBal = self.coinbaseBalance()
        assert postBal == preBal - depositRequired
        expExpiry = timePreReserve + 3600*4
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]

        # close but not yet expired
        self.s.block.timestamp += 3600 * 4
        preBal = self.coinbaseBalance()
        assert 0 == self.c.reserveTicket(2, txHash, value=depositRequired)
        postBal = self.coinbaseBalance()
        assert postBal == preBal
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]

        # expired reservation can now be reserved
        self.s.block.timestamp += 100
        timePreReserve = self.s.block.timestamp
        preBal = self.coinbaseBalance()
        assert 1 == self.c.reserveTicket(2, txHash, value=depositRequired)
        postBal = self.coinbaseBalance()
        assert postBal == preBal - depositRequired
        expExpiry = timePreReserve + 3600*4
        assert self.c.lookupTicket(2) == [btcAddr, numWei, weiPerSatoshi, expExpiry, expSender, txHash]


    # actor/user/claimer balance (as opposed to contract's balance)
    def coinbaseBalance(self):
        return self.s.block.get_balance(self.s.block.coinbase)
