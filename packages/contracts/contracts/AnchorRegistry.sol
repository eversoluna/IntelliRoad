// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title AnchorRegistry
/// @notice Stores a tamper-evident record that a given hash existed at a given time.
/// @dev Keep heavy data off-chain; only anchor small proofs.
contract AnchorRegistry {
    event Anchored(bytes32 indexed hash, address indexed submitter, uint256 timestamp);

    mapping(bytes32 => bool) public isAnchored;

    function anchor(bytes32 hash) external {
        require(hash != bytes32(0), "EMPTY_HASH");
        require(!isAnchored[hash], "ALREADY_ANCHORED");
        isAnchored[hash] = true;
        emit Anchored(hash, msg.sender, block.timestamp);
    }
}
