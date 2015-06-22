inset('btcSpecialTx.py')

# TODO
# claimer 20bytes, claimExpiry 2bytes
# claimTxHash are 32bytes each
# btcAddr 20 bytes, numWei 10bytes, double-check weiPerSatoshi 2bytes


extern relayContract: [verifyTx:iiai:i]


data gTicket[2**64](_btcAddr, _numWei, _weiPerSatoshi, _claimer, _claimExpiry, _claimTxHash)

data gTicketId  # last ticket id.  first valid id is 1

data trustedBtcRelay


macro ONE_HOUR_IN_SECS: 60*60
macro EXPIRY_TIME_SECS: 4 * ONE_HOUR_IN_SECS

# TODO disable testingOnly methods
event claimSuccess(btcAddr, numSatoshi, ethAddr, satoshiIn2ndOutput)
macro LAST_TID: self.gTicketId
def testingOnlyReserveLatestTicket(txHash):
    return(self.reserveTicket(value=msg.value, LAST_TID, txHash))

def testingOnlyClaimTicketLatestTicket(txStr:str, txHash, txIndex, sibling:arr, txBlockHash):
    return(self.claimTicket(LAST_TID, txStr, txHash, txIndex, sibling, txBlockHash))

# def ttLastAvail():
#     return(m_ticketAvailable(LAST_TID))
#
# def ttLastHasDeposit():
#     return(m_ticketHasDeposit(LAST_TID))

def ttClaimHash():
    return(self.gTicket[LAST_TID]._claimTxHash)

def ttLastTid():
    return(LAST_TID)




# trustedRelayContract is the address of the trusted btcrelay contract
def setTrustedBtcRelay(trustedRelayContract):
    # TODO ensure only callable one time
    if trustedRelayContract:
        self.trustedBtcRelay = trustedRelayContract
        return(1)
    return(0)


def createTicket(btcAddr, numWei, weiPerSatoshi):
    if msg.value < numWei || numWei == 0:
        send(msg.sender, msg.value)
        log(type=ticketEvent, 0, 0)
        return(0)

    self.gTicketId += 1
    # TODO use var for gTicketId ?
    self.gTicket[self.gTicketId]._btcAddr = btcAddr
    self.gTicket[self.gTicketId]._numWei = numWei
    self.gTicket[self.gTicketId]._weiPerSatoshi = weiPerSatoshi
    self.gTicket[self.gTicketId]._claimExpiry = 1 # allow to be reserved; see m_ticketAvailable()

    log(type=ticketEvent, 0, self.gTicketId)
    return(self.gTicketId)


def lookupTicket(ticketId):
    if (ticketId > self.gTicketId || ticketId <= 0):
        return([]:arr)

    return([self.gTicket[ticketId]._btcAddr, self.gTicket[ticketId]._numWei, self.gTicket[ticketId]._weiPerSatoshi, self.gTicket[ticketId]._claimExpiry, self.gTicket[ticketId]._claimer, self.gTicket[ticketId]._claimTxHash]:arr)


# data[0] is the return value / error code
event ticketEvent(ticketId:indexed, rval)
macro POW_TARGET: 2**235
def reserveTicket(ticketId, txHash, nonce):
    if m_ticketAvailable(ticketId) && m_keccak(txHash, nonce) < POW_TARGET:
        self.gTicket[ticketId]._claimer = msg.sender
        self.gTicket[ticketId]._claimExpiry = block.timestamp + EXPIRY_TIME_SECS
        self.gTicket[ticketId]._claimTxHash = txHash
        log(type=ticketEvent, ticketId, ticketId)
        return(ticketId)

    send(msg.sender, msg.value)  # refund whatever deposit provided
    log(type=ticketEvent, ticketId, 0)
    return(0)


macro m_keccak($txHash, $nonce):
    with $x = ~alloc(40):
        ~mstore($x, $txHash)
        ~mstore($x + 32, $nonce*2**192)
        sha3($x, chars=40)



macro CLAIM_FAIL_CLAIMER:  99990100
macro CLAIM_FAIL_TX_HASH:  99990200
macro CLAIM_FAIL_INSUFFICIENT_SATOSHI:  99990400
macro CLAIM_FAIL_FALLTHRU: 99999999

# a ticket can only be claimed once, and thus the Bitcoin tx should send enough
# bitcoins so that all the ether can be claimed
def claimTicket(ticketId, txStr:str, txHash, txIndex, sibling:arr, txBlockHash):
    if (msg.sender != self.gTicket[ticketId]._claimer):
        log(type=ticketEvent, ticketId, CLAIM_FAIL_CLAIMER)
        return(0)

    if (txHash != self.gTicket[ticketId]._claimTxHash):
        log(type=ticketEvent, ticketId, CLAIM_FAIL_TX_HASH)
        return(0)

    outputData = self.getFirst2Outputs(txStr, outitems=4)

    if outputData == 0:
        return(0)


    numSatoshi = outputData[0]
    weiBuyable = numSatoshi * self.gTicket[ticketId]._weiPerSatoshi
    if weiBuyable < self.gTicket[ticketId]._numWei:
        log(type=ticketEvent, ticketId, CLAIM_FAIL_INSUFFICIENT_SATOSHI)
        return(0)
    weiBuyable = self.gTicket[ticketId]._numWei

    indexScriptOne = outputData[1]

    #TODO strictly compare the script because an attacker may have a script that mentions
    #our BTC address, but the BTC is not spendable by our private key (only spendable by attacker's key)
    # btcWasSentToMe = compareScriptWithAddr(indexScriptOne, txStr, self.btcAcceptAddr)
    addrBtcWasSentTo = getEthAddr(indexScriptOne, txStr, 20, 6)

    if addrBtcWasSentTo != self.gTicket[ticketId]._btcAddr:
        return(0)


    if self.trustedBtcRelay.verifyTx(txHash, txIndex, sibling, txBlockHash):

        satoshiIn2ndOutput = outputData[2]

        indexScriptTwo = outputData[3]
        ethAddr = getEthAddr(indexScriptTwo, txStr, 20, 6)

        encodedFee = (satoshiIn2ndOutput % 10000)  # encodedFee of 1234 means 12.34%
        feeToClaimer = weiBuyable * encodedFee / 10000

        weiToClaimer = feeToClaimer

        res1 = send(msg.sender, weiToClaimer)
        res2 = send(ethAddr, weiBuyable - feeToClaimer)

        m_deleteTicket(ticketId)

        log(type=ticketEvent, ticketId, ticketId)

        # for testing only; remove when deploying
        log(type=claimSuccess, addrBtcWasSentTo, numSatoshi, ethAddr, satoshiIn2ndOutput)

        return(ticketId)

    log(type=ticketEvent, ticketId, CLAIM_FAIL_FALLTHRU)
    return(0)


macro TICKET_FIELDS: 7
# all tickets except those that have been claimed
def getOpenTickets(startTicketId, endTicketId):
    if endTicketId > self.gTicketId:
        endTicketId = self.gTicketId

    maxSize = (endTicketId - startTicketId + 1) * TICKET_FIELDS
    ticketArr = array(maxSize)

    j = 0
    i = startTicketId
    while i <= endTicketId:
        if self.gTicket[i]._claimExpiry:
            ticketArr[j]   = i
            ticketArr[j+1] = self.gTicket[i]._btcAddr
            ticketArr[j+2] = self.gTicket[i]._numWei
            ticketArr[j+3] = self.gTicket[i]._weiPerSatoshi
            ticketArr[j+4] = self.gTicket[i]._claimExpiry
            ticketArr[j+5] = self.gTicket[i]._claimer
            ticketArr[j+6] = self.gTicket[i]._claimTxHash
            j += TICKET_FIELDS

        i += 1

    shrink(ticketArr, j)
    return(ticketArr:arr)


#
#  macros
#

macro m_ticketAvailable($ticketId):
    with $claimExpiry = self.gTicket[$ticketId]._claimExpiry:
        $claimExpiry > 0 && block.timestamp > $claimExpiry  # claimExpiry 0 means ticket doesn't exist

macro m_deleteTicket($ticketId):
    self.gTicket[$ticketId]._btcAddr = 0
    self.gTicket[$ticketId]._numWei = 0
    self.gTicket[$ticketId]._weiPerSatoshi = 0
    self.gTicket[$ticketId]._claimer = 0
    self.gTicket[$ticketId]._claimExpiry = 0
    self.gTicket[$ticketId]._claimTxHash = 0


macro getEthAddr($indexStart, $inStr, $size, $offset):
    $endIndex = ($indexStart*2) + $offset + ($size * 2)

    $result = 0
    $exponent = 0
    $j = ($indexStart*2) + $offset
    while $j < $endIndex:
        $char = getch($inStr, $endIndex-1-$exponent)
        # log($char)

        if ($char >= 97 && $char <= 102):  # only handles lowercase a-f
            $numeric = $char - 87
        else:
            $numeric = $char - 48
        # log($numeric)

        $result += $numeric * 16^$exponent
        # log(result)

        $j += 1
        $exponent += 1

    $result
