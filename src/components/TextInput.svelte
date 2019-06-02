<script>
  export let value;
  export let title;
  export let valid;

  let touched = false;
  let error = false;

  $: error = !valid && touched;
</script>

<div class="mt3">
  <label class="db fw6 lh-copy f6" for="{title}">{title}</label>
  <input
    class="pa2 input-reset ba bg-transparent hover-bg-black hover-white
  w-100"
    type="text"
    name="{title}"
    id="{title}"
    bind:value
    on:blur="{() => touched = true}"
    required
  />
  {#if error}
  <p class="red">{`Please enter a valid ${title}.`}</p>
  {/if}
</div>
