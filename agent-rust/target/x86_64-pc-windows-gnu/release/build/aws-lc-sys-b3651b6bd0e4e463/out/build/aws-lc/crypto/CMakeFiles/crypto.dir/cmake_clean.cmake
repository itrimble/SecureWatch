file(REMOVE_RECURSE
  "../../artifacts/libaws_lc_0_29_0_crypto.a"
  "../../artifacts/libaws_lc_0_29_0_crypto.pdb"
)

# Per-language clean rules from dependency scanning.
foreach(lang ASM_NASM C)
  include(CMakeFiles/crypto.dir/cmake_clean_${lang}.cmake OPTIONAL)
endforeach()
