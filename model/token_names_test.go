package model

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestGetAllTokenNames(t *testing.T) {
	truncateTables(t)
	seedQuotaDatesFilterData(t)

	names, err := GetAllTokenNames()
	require.NoError(t, err)
	// cpa-gpt exists for two users but must appear only once.
	assert.ElementsMatch(t, []string{"cpa-gpt", "cpa-claude"}, names)

	// Soft-deleted tokens are excluded: deleting alice's cpa-claude leaves
	// only cpa-gpt (bob's copy still exists).
	require.NoError(t, DB.Delete(&Token{Id: 12}).Error)
	names, err = GetAllTokenNames()
	require.NoError(t, err)
	assert.Equal(t, []string{"cpa-gpt"}, names)
}
