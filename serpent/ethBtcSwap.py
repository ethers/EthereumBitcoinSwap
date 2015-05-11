
# TODO
# claimer 20bytes, claimExpiry 2bytes
# claimTxHash are 32bytes each
# btcAddr 20 bytes, numWei 10bytes, weiPerSatoshi 2bytes


data gTicket[2**64](_btcAddr, _numWei, _weiPerSatoshi, _claimer, _claimExpiry, _claimTxHash)

data gTicketId


macro ONE_HOUR_IN_SECS: 60*60
macro EXPIRY_TIME_SECS: 4 * ONE_HOUR_IN_SECS


def createTicket(btcAddr, numWei, weiPerSatoshi):
    self.gTicketId += 1
    # use var for gTicketId ?
    self.gTicket[self.gTicketId]._btcAddr = btcAddr
    self.gTicket[self.gTicketId]._numWei = numWei
    self.gTicket[self.gTicketId]._weiPerSatoshi = weiPerSatoshi
    # claimData left as zeros


def reserveTicket(ticketId, txHash):
    if (m_ticketIsUnexpired(ticketId) || m_ticketHasDeposit(ticketId)):
        return(0)

    self.gTicket[ticketId]._claimer = msg.sender
    self.gTicket[ticketId]._claimExpiry = block.timestamp + EXPIRY_TIME_SECS
    self.gTicket[ticketId]._claimTxHash = txHash
    return(1)


# required deposit is 5% numWei
macro m_ticketHasDeposit($ticketId):
    msg.value < self.gTicket[$ticketId]._numWei / 20

macro m_ticketIsUnexpired($ticketId):
    block.timestamp <= self.gTicket[$ticketId]._claimExpiry
