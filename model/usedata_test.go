package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func seedQuotaDatesFilterData(t *testing.T) {
	t.Helper()
	require.NoError(t, DB.Create(&User{Id: 1, Username: "alice", AffCode: "alice-aff"}).Error)
	require.NoError(t, DB.Create(&User{Id: 2, Username: "bob", AffCode: "bob-aff"}).Error)
	require.NoError(t, DB.Create(&Token{Id: 11, UserId: 1, Key: "sk-alice-gpt", Name: "cpa-gpt"}).Error)
	require.NoError(t, DB.Create(&Token{Id: 12, UserId: 1, Key: "sk-alice-claude", Name: "cpa-claude"}).Error)
	require.NoError(t, DB.Create(&Token{Id: 21, UserId: 2, Key: "sk-bob-gpt", Name: "cpa-gpt"}).Error)
	seedFlowQuotaData(t, QuotaData{UserID: 1, Username: "alice", ModelName: "gpt-6.1-sol", TokenID: 11, CreatedAt: 1000, Count: 10, Quota: 100, TokenUsed: 50})
	seedFlowQuotaData(t, QuotaData{UserID: 1, Username: "alice", ModelName: "claude-fable-5-2", TokenID: 12, CreatedAt: 1100, Count: 5, Quota: 200, TokenUsed: 30})
	seedFlowQuotaData(t, QuotaData{UserID: 2, Username: "bob", ModelName: "gpt-6.1-sol", TokenID: 21, CreatedAt: 1200, Count: 7, Quota: 70, TokenUsed: 20})
}

func TestGetAllQuotaDatesFiltersByModelAndToken(t *testing.T) {
	truncateTables(t)
	seedQuotaDatesFilterData(t)

	rows, err := GetAllQuotaDates(0, 2000, "", "", "")
	require.NoError(t, err)
	assert.Len(t, rows, 3)

	rows, err = GetAllQuotaDates(0, 2000, "", "gpt-6.1-sol", "")
	require.NoError(t, err)
	require.Len(t, rows, 2)
	assert.Equal(t, "gpt-6.1-sol", rows[0].ModelName)
	assert.Equal(t, "gpt-6.1-sol", rows[1].ModelName)

	// "cpa-gpt" is a key name held by both users; without a username the
	// filter matches both keys.
	rows, err = GetAllQuotaDates(0, 2000, "", "", "cpa-gpt")
	require.NoError(t, err)
	assert.Len(t, rows, 2)

	// With a username the same key name narrows to that user's key only.
	rows, err = GetAllQuotaDates(0, 2000, "alice", "", "cpa-gpt")
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, "gpt-6.1-sol", rows[0].ModelName)
	assert.Equal(t, 100, rows[0].Quota)

	rows, err = GetAllQuotaDates(0, 2000, "alice", "claude-fable-5-2", "cpa-claude")
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, 200, rows[0].Quota)

	rows, err = GetAllQuotaDates(0, 2000, "", "", "no-such-key")
	require.NoError(t, err)
	assert.Empty(t, rows)

	rows, err = GetAllQuotaDates(0, 2000, "", "no-such-model", "")
	require.NoError(t, err)
	assert.Empty(t, rows)
}

func TestGetQuotaDataByUserIdFiltersByModelAndToken(t *testing.T) {
	truncateTables(t)
	seedQuotaDatesFilterData(t)

	rows, err := GetQuotaDataByUserId(1, 0, 2000, "", "")
	require.NoError(t, err)
	assert.Len(t, rows, 2)

	rows, err = GetQuotaDataByUserId(1, 0, 2000, "claude-fable-5-2", "")
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, "claude-fable-5-2", rows[0].ModelName)

	rows, err = GetQuotaDataByUserId(1, 0, 2000, "", "cpa-gpt")
	require.NoError(t, err)
	require.Len(t, rows, 1)
	assert.Equal(t, "gpt-6.1-sol", rows[0].ModelName)

	// Bob's key has the same name but belongs to another user.
	rows, err = GetQuotaDataByUserId(2, 0, 2000, "", "cpa-claude")
	require.NoError(t, err)
	assert.Empty(t, rows)
}
