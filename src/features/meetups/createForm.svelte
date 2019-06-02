<script>
  import { isEmpty, isValidEmail } from "../../helpers/validation.js";
  import Meetup from "../meetups/meetupStore.js";
  import TextInput from "../../components/TextInput.svelte";

  export let title = "";
  export let subtitle = "";
  export let description = "";
  export let imageURL = "";
  export let address = "";
  export let contact = "";
 

  const addMeetup = () => {
    const meetUpData = {
      title,
      subtitle,
      description,
      imageURL,
      address,
      contact
    };

    meetups.addMeetup(meetUpData)

    // reset inputs
    title = "";
    subtitle = "";
    description = "";
    imageURL = "";
    address = "";
    contact = "";
  };
</script>

<form
  class="measure center"
  on:submit|preventDefault={() => Meetup.addMeetup()}
>
  <fieldset id="sign_up" class="ba b--transparent ph0 mh0">
    <legend class="f4 fw6 ph0 mh0">Create a Meetup</legend>

    <TextInput title="Name" bind:value="{title}"
    valid={!isEmpty(title)}/>
    <TextInput title="Subtitle" bind:value="{subtitle}" valid={true}/>
   
   
    <div class="mv3">
      <label class="db fw6 lh-copy f6" for="description">Description</label>
      <textarea
        class="b pa2 input-reset ba bg-transparent hover-bg-black hover-white w-100"
        type="text"
        name=""
        id="description"
        bind:value="{description}"
      />
    </div>
    <TextInput title="Image URL" bind:value="{imageURL}" valid={true}/>
    <TextInput title="Address" bind:value="{address}" valid={true}/>
    <TextInput 
      title="Contact Email" 
      bind:value="{contact}"
      valid={isValidEmail(contact) && !isEmpty(contact)}/>
  </fieldset>
  <div class="">
    <input
      class="b ph3 pv2 input-reset ba b--black bg-transparent grow pointer f6 dib"
      type="submit"
      value="Create Meetup"
      disabled={!isValidEmail(contact) || isEmpty(contact) ||isEmpty(title)  }
    />
  </div>
</form>
