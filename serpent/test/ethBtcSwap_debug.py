inset('../ethBtcSwap.py')

def funcKeccak(txHash, ticketId, nonce):
    return(m_keccak(txHash, ticketId, nonce))

def funcTicketAvailable(ticketId):
    return(m_ticketAvailable(ticketId))
