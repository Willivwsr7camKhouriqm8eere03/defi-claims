// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import { FHE, euint32, ebool } from "@fhevm/solidity/lib/FHE.sol";
import { SepoliaConfig } from "@fhevm/solidity/config/ZamaConfig.sol";

contract DeFiInsuranceFHE is SepoliaConfig {
    struct EncryptedClaim {
        uint256 id;
        euint32 encryptedClaimData;
        euint32 encryptedEvidence;
        uint256 timestamp;
    }

    struct DecryptedClaim {
        string claimData;
        string evidence;
        bool isProcessed;
    }

    uint256 public claimCount;
    mapping(uint256 => EncryptedClaim) public encryptedClaims;
    mapping(uint256 => DecryptedClaim) public decryptedClaims;

    mapping(address => ebool) private votable;
    mapping(uint256 => euint32) private encryptedVotes;
    mapping(uint256 => uint256) private requestToClaimId;

    event ClaimSubmitted(uint256 indexed id, uint256 timestamp);
    event DecryptionRequested(uint256 indexed id);
    event ClaimDecrypted(uint256 indexed id);
    event VoteCast(uint256 indexed claimId, address voter);

    modifier onlyClaimant(uint256 claimId) {
        _;
    }

    modifier onlyVoter() {
        _;
    }

    /// @notice Submit an encrypted insurance claim
    function submitEncryptedClaim(
        euint32 encryptedClaimData,
        euint32 encryptedEvidence
    ) public {
        claimCount += 1;
        uint256 newId = claimCount;

        encryptedClaims[newId] = EncryptedClaim({
            id: newId,
            encryptedClaimData: encryptedClaimData,
            encryptedEvidence: encryptedEvidence,
            timestamp: block.timestamp
        });

        decryptedClaims[newId] = DecryptedClaim({
            claimData: "",
            evidence: "",
            isProcessed: false
        });

        encryptedVotes[newId] = FHE.asEuint32(0);

        emit ClaimSubmitted(newId, block.timestamp);
    }

    /// @notice Request decryption of a claim
    function requestClaimDecryption(uint256 claimId) public onlyClaimant(claimId) {
        EncryptedClaim storage claim = encryptedClaims[claimId];
        require(!decryptedClaims[claimId].isProcessed, "Already processed");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(claim.encryptedClaimData);
        ciphertexts[1] = FHE.toBytes32(claim.encryptedEvidence);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptClaim.selector);
        requestToClaimId[reqId] = claimId;

        emit DecryptionRequested(claimId);
    }

    /// @notice Callback to handle decrypted claim
    function decryptClaim(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 claimId = requestToClaimId[requestId];
        require(claimId != 0, "Invalid request");

        DecryptedClaim storage dClaim = decryptedClaims[claimId];
        require(!dClaim.isProcessed, "Already processed");

        FHE.checkSignatures(requestId, cleartexts, proof);

        string[] memory results = abi.decode(cleartexts, (string[]));

        dClaim.claimData = results[0];
        dClaim.evidence = results[1];
        dClaim.isProcessed = true;

        emit ClaimDecrypted(claimId);
    }

    /// @notice Cast an encrypted vote
    function castVote(uint256 claimId, ebool encryptedVote) public onlyVoter {
        require(FHE.isInitialized(encryptedVotes[claimId]), "Claim not found");

        encryptedVotes[claimId] = FHE.add(
            encryptedVotes[claimId],
            FHE.asEuint32(FHE.decryptBool(encryptedVote) ? 1 : 0)
        );

        emit VoteCast(claimId, msg.sender);
    }

    /// @notice Request decryption of vote tally
    function requestVoteTallyDecryption(uint256 claimId) public {
        euint32 tally = encryptedVotes[claimId];
        require(FHE.isInitialized(tally), "Claim not found");

        bytes32 ;
        ciphertexts[0] = FHE.toBytes32(tally);

        uint256 reqId = FHE.requestDecryption(ciphertexts, this.decryptVoteTally.selector);
        requestToClaimId[reqId] = claimId;
    }

    /// @notice Callback to handle decrypted vote tally
    function decryptVoteTally(
        uint256 requestId,
        bytes memory cleartexts,
        bytes memory proof
    ) public {
        uint256 claimId = requestToClaimId[requestId];

        FHE.checkSignatures(requestId, cleartexts, proof);

        uint32 tally = abi.decode(cleartexts, (uint32));
    }

    /// @notice Get decrypted claim details
    function getDecryptedClaim(uint256 claimId) public view returns (
        string memory claimData,
        string memory evidence,
        bool isProcessed
    ) {
        DecryptedClaim storage c = decryptedClaims[claimId];
        return (c.claimData, c.evidence, c.isProcessed);
    }

    /// @notice Get encrypted vote count
    function getEncryptedVote(uint256 claimId) public view returns (euint32) {
        return encryptedVotes[claimId];
    }
}
