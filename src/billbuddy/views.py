# Create your views here.
from django.http import HttpResponse
from django.template import Context, loader, RequestContext
from django.shortcuts import render, get_object_or_404
from django.core.context_processors import csrf
from django.shortcuts import render_to_response

from billbuddy.models import userCheckedIn

import ordrin
import ordrin.data
import ordrin.errors

ordrin_api_key = 'WoUgWjr9pBrJVAZdtQLIUi2nXvXEujWegL4PnGZ717M'

api = ordrin.APIs(ordrin_api_key, ordrin.TEST)

RESTAURANT_ID='5913'
user_id='abc'

def index(request):
    template = loader.get_template('billbuddy/index.html')
    restaurant_name = api.restaurant.get_details(RESTAURANT_ID)['name']
    context = Context({
        'restaurant_name': restaurant_name,
        'restaurant_id' : RESTAURANT_ID,
        'user_id' : user_id,
    })
    return render_to_response('billbuddy/index.html', context, context_instance=RequestContext(request))

def check_in(request):
    user_id = request.POST['user_id']
    restaurant_id = request.POST['restaurant_id']
    restaurant_name = api.restaurant.get_details(restaurant_id)['name']
    
    # check if an object already exists for this user
    matching_users = userCheckedIn.objects.filter(user_id=user_id)
    
    # if there's already a user obj...
    if matching_users:
    
        ## ENSURE NO DUPES
        # delete all but the first matching user
        for user_obj in matching_users[1:]:
            user_obj.delete()
            
        # reset data
        user_obj = matching_users[0]
        user_obj.checked_in = True
        user_obj.part_of_group = False

    # FIRST TIME user has checked in
    else:
        # if not, create and add one
        user_obj = userCheckedIn(
            user_id=user_id,
            checked_in_at=restaurant_id,
            checked_in=True,
            part_of_group=False,
            )
    user_obj.save()
        
    context = {'user_id' : user_id, 'restaurant_id':restaurant_id, 'restaurant_name':restaurant_name,}
    return render_to_response('billbuddy/check_in.html', context, context_instance=RequestContext(request))

def join_group(request):
    user_id = request.POST['user_id']
    restaurant_id = request.POST['restaurant_id']
    group_name = request.POST['groupname']
    restaurant_name = api.restaurant.get_details(restaurant_id)['name']
    
    # check if an object already exists for this user
    matching_users = userCheckedIn.objects.filter(user_id=user_id)
    
    # if there's already a user obj...
    if not matching_users:
        raise Http404("no matching user")

    # set data
    user_obj = matching_users[0]
    user_obj.part_of_group = True
    user_obj.group_id = group_name
    user_obj.save()

    restaurant_detail = api.restaurant.get_details(restaurant_id)
    menu = restaurant_detail['menu']    
    context = {
        'user_id' : user_id,
        'restaurant_id':restaurant_id,
        'restaurant_name':restaurant_name,
        'groupname':group_name,
        'menu' : menu,
        }
    return render_to_response('billbuddy/order.html', context, context_instance=RequestContext(request))

def order(request, restaurant_id):
    return render(request, 'billbuddy/order.html', context)